<?php

declare(strict_types=1);

use App\Actions\Invoices\CreateInvoice;
use App\Actions\Quotes\AcceptQuote;
use App\Actions\Quotes\ConvertQuoteToInvoice;
use App\Actions\Quotes\CreateQuote;
use App\Actions\Quotes\DeclineQuote;
use App\Actions\Quotes\MarkExpiredQuotes;
use App\Actions\Quotes\RenderQuotePdf;
use App\Actions\Quotes\SendQuote;
use App\Data\QuoteData;
use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Mail\QuoteSent;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use App\Services\DocRaptor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

function createQuotePayload(array $overrides = []): array
{
    return [
        'client_name' => 'Acme SA',
        'client_email' => 'compta@acme.ch',
        'currency' => 'CHF',
        'vat_rate' => 8.1,
        'issued_at' => '2026-09-07',
        'valid_until' => '2026-10-07',
        'items' => [['offer' => 'accompagne', 'quantity' => 2, 'unit_price_cents' => 15_000]],
        ...$overrides,
    ];
}

function sender(?string $key = null): SendQuote
{
    return new SendQuote(new RenderQuotePdf(new DocRaptor($key, true, 'https://api.docraptor.com/docs')));
}

test('it stores the quote as a draft with computed totals, the creator, and broadcasts', function (): void {
    $creator = User::factory()->manager()->create();

    $quote = (new CreateQuote)->handle(QuoteData::from(createQuotePayload(['discount_percent' => 10])), $creator);

    expect($quote->number)->toBe('DV-27001')
        ->and($quote->status)->toBe(QuoteStatus::Draft)
        ->and($quote->subtotal_cents)->toBe(30_000)
        ->and($quote->discount_cents)->toBe(3_000)
        ->and($quote->vat_cents)->toBe(2_187)
        ->and($quote->amount_cents)->toBe(29_187)
        ->and($quote->currency)->toBe(Currency::CHF)
        ->and($quote->created_by)->toBe($creator->id)
        ->and($quote->statusChanges()->count())->toBe(1)
        ->and($quote->statusChanges()->first()?->note)->toBe('Création');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'quotes'
        && $event->message === 'a créé le devis DV-27001');
});

test('numbers follow the DV-27 prefix and a growing sequence', function (): void {
    Quote::factory()->create(['number' => 'DV-27053']);
    Quote::factory()->create(['number' => 'DV-27009']);

    expect((new CreateQuote)->handle(QuoteData::from(createQuotePayload()))->number)->toBe('DV-27054')
        ->and(CreateQuote::nextNumber())->toBe('DV-27055');
});

test('sending a draft e-mails the client with the PDF, logs the transition and notes the lead', function (): void {
    Http::fake(['api.docraptor.com/*' => Http::response('%PDF-1.4 fake', 200)]);
    $manager = User::factory()->manager()->create();
    $lead = Lead::factory()->create(['last_contacted_at' => null]);
    $quote = Quote::factory()->status(QuoteStatus::Draft)->create(['client_email' => 'client@example.ch', 'lead_id' => $lead->id, 'number' => 'DV-27010']);

    $withPdf = sender('key')->handle($quote, $manager);

    expect($withPdf)->toBeTrue()
        ->and($quote->fresh()->status)->toBe(QuoteStatus::Sent)
        ->and($quote->fresh()->sent_at)->not->toBeNull()
        ->and($quote->statusChanges()->latest('id')->first()?->to_status)->toBe(QuoteStatus::Sent)
        ->and($lead->fresh()->last_contacted_at)->not->toBeNull()
        ->and($lead->notes()->first()?->body)->toContain('DV-27010');

    Mail::assertQueued(QuoteSent::class, fn (QuoteSent $mail): bool => $mail->hasTo('client@example.ch')
        && $mail->quote->is($quote)
        && count($mail->attachments()) === 1);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'a envoyé le devis'));
});

test('sending without DocRaptor still e-mails, without attachment', function (): void {
    $quote = Quote::factory()->status(QuoteStatus::Draft)->create(['client_email' => 'client@example.ch']);

    expect(sender()->handle($quote))->toBeFalse();
    Mail::assertQueued(QuoteSent::class, fn (QuoteSent $mail): bool => $mail->attachments() === []);
});

test('sending requires a client e-mail and a sendable status', function (): void {
    expect(fn (): bool => sender()->handle(Quote::factory()->status(QuoteStatus::Draft)->create(['client_email' => null])))
        ->toThrow(ValidationException::class)
        ->and(fn (): bool => sender()->handle(Quote::factory()->status(QuoteStatus::Invoiced)->create()))
        ->toThrow(ValidationException::class);
});

test('accepting and declining log the transition and note the lead', function (): void {
    $lead = Lead::factory()->create();
    $accepted = Quote::factory()->create(['lead_id' => $lead->id, 'number' => 'DV-27020']);
    $declined = Quote::factory()->create(['lead_id' => $lead->id, 'number' => 'DV-27021']);

    (new AcceptQuote)->handle($accepted);
    (new DeclineQuote)->handle($declined, 'Trop cher');

    expect($accepted->fresh()->status)->toBe(QuoteStatus::Accepted)
        ->and($accepted->fresh()->accepted_at)->not->toBeNull()
        ->and($declined->fresh()->status)->toBe(QuoteStatus::Declined)
        ->and($declined->statusChanges()->latest('id')->first()?->note)->toBe('Trop cher')
        ->and($lead->notes()->pluck('body')->join(' '))->toContain('DV-27020 accepté')
        ->toContain('Motif : Trop cher');

    expect(fn (): Quote => (new AcceptQuote)->handle($declined->fresh()))->toThrow(ValidationException::class);
});

test('converting creates a draft invoice with the same lines and links it to the quote', function (): void {
    $by = User::factory()->manager()->create();
    $lead = Lead::factory()->create();
    $quote = Quote::factory()->accepted()->create([
        'lead_id' => $lead->id,
        'number' => 'DV-27030',
        'currency' => Currency::EUR,
        'vat_rate' => 0,
        'discount_percent' => 10,
        'items' => [['offer' => 'confie', 'description' => 'Offre Confié', 'quantity' => 1, 'unit_price_cents' => 200_000]],
        'notes' => 'Merci.',
    ]);

    $invoice = (new ConvertQuoteToInvoice(new CreateInvoice))->handle($quote, $by);

    expect($invoice->status)->toBe(InvoiceStatus::Draft)
        ->and($invoice->number)->toBe('RP-27001')
        ->and($invoice->amount_cents)->toBe(180_000)
        ->and($invoice->discount_percent)->toBe(10.0)
        ->and($invoice->lead_id)->toBe($lead->id)
        ->and($invoice->created_by)->toBe($by->id)
        ->and($invoice->issued_at->toDateString())->toBe(today()->toDateString())
        ->and($invoice->due_at->toDateString())->toBe(today()->addDays(30)->toDateString())
        ->and($quote->fresh()->status)->toBe(QuoteStatus::Invoiced)
        ->and($quote->fresh()->invoice_id)->toBe($invoice->id)
        ->and($lead->notes()->first()?->body)->toContain('RP-27001');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a transformé le devis DV-27030 en facture RP-27001');
    expect(Invoice::count())->toBe(1);
});

test('a declined quote cannot be invoiced', function (): void {
    $quote = Quote::factory()->status(QuoteStatus::Declined)->create();

    expect(fn (): Invoice => (new ConvertQuoteToInvoice(new CreateInvoice))->handle($quote))->toThrow(ValidationException::class)
        ->and(Invoice::count())->toBe(0);
});

test('sent quotes past their validity expire, the others are left alone', function (): void {
    $stale = Quote::factory()->create(['valid_until' => now()->subDay()]);
    $fresh = Quote::factory()->create(['valid_until' => now()->addDay()]);
    $draft = Quote::factory()->status(QuoteStatus::Draft)->create(['valid_until' => now()->subDay()]);

    expect((new MarkExpiredQuotes)->handle())->toBe(1)
        ->and($stale->fresh()->status)->toBe(QuoteStatus::Expired)
        ->and($fresh->fresh()->status)->toBe(QuoteStatus::Sent)
        ->and($draft->fresh()->status)->toBe(QuoteStatus::Draft);

    expect((new MarkExpiredQuotes)->handle())->toBe(0);
});
