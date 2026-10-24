<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Enums\QuoteStatus;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a manager turns a draft invoice into a quote: same content, invoice cancelled and linked', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = Lead::factory()->create();
    $invoice = Invoice::factory()->status(InvoiceStatus::Draft)->create([
        'number' => 'RP-27042',
        'lead_id' => $lead->id,
        'discount_percent' => 10,
        'bank_iban' => 'CH93 0076 2011 6238 5295 7',
        'bank_name' => 'Banque test',
    ]);

    $response = $this->actingAs($manager)->post(route('invoices.quote', $invoice));

    $quote = Quote::sole();
    $response->assertRedirect(route('tools.quotes.show', $quote));
    $invoice->refresh();

    expect($quote->status)->toBe(QuoteStatus::Draft)
        ->and($quote->client_name)->toBe($invoice->client_name)
        ->and($quote->items)->toBe($invoice->items)
        ->and($quote->subtotal_cents)->toBe($invoice->subtotal_cents)
        ->and($quote->discount_percent)->toBe(10.0)
        ->and($quote->bank_iban)->toBe('CH93 0076 2011 6238 5295 7')
        ->and($quote->lead_id)->toBe($lead->id)
        ->and($quote->statusChanges()->sole()->note)->toBe('Créé depuis la facture RP-27042')
        ->and($invoice->status)->toBe(InvoiceStatus::Cancelled)
        ->and($invoice->quote_id)->toBe($quote->id)
        ->and($invoice->statusChanges()->latest('id')->first()?->note)->toBe("Devis {$quote->number} créé")
        ->and($lead->notes()->where('body', 'like', "Devis {$quote->number} créé depuis la facture RP-27042.%")->exists())->toBeTrue();
});

test('a paid invoice or an already converted one cannot become a quote, members are refused', function (): void {
    $manager = User::factory()->manager()->create();

    $paid = Invoice::factory()->paid()->create();
    $this->actingAs($manager)->from(route('invoices.show', $paid))
        ->post(route('invoices.quote', $paid))
        ->assertRedirect(route('invoices.show', $paid))
        ->assertSessionHasErrors('status');

    $quote = Quote::factory()->create();
    $converted = Invoice::factory()->status(InvoiceStatus::Cancelled)->create(['quote_id' => $quote->id]);
    $this->actingAs($manager)->from(route('invoices.show', $converted))
        ->post(route('invoices.quote', $converted))
        ->assertSessionHasErrors('status');

    $draft = Invoice::factory()->status(InvoiceStatus::Draft)->create();
    $this->actingAs(User::factory()->create())->post(route('invoices.quote', $draft))->assertForbidden();

    expect(Quote::count())->toBe(1);
});

test('a cancelled invoice can still be turned into a quote without a status change', function (): void {
    $invoice = Invoice::factory()->status(InvoiceStatus::Cancelled)->create();

    $this->actingAs(User::factory()->manager()->create())->post(route('invoices.quote', $invoice))->assertSessionHasNoErrors();

    expect($invoice->fresh()->quote_id)->toBe(Quote::sole()->id)
        ->and($invoice->fresh()->status)->toBe(InvoiceStatus::Cancelled)
        ->and($invoice->statusChanges()->count())->toBe(0);
});

test('the detail page and the list expose can_quote and the linked quote', function (): void {
    $quote = Quote::factory()->create(['number' => 'DV-27099']);
    $invoice = Invoice::factory()->status(InvoiceStatus::Cancelled)->create(['quote_id' => $quote->id]);
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('invoices.show', $invoice))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoice.can_quote', false)
            ->where('invoice.quote.number', 'DV-27099')
            ->where('invoice.quote.uuid', $quote->uuid));

    $this->actingAs($user)->get(route('invoices.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoices.0.can_quote', false)
            ->where('invoices.0.quote.number', 'DV-27099'));

    $draft = Invoice::factory()->status(InvoiceStatus::Draft)->create();
    $this->actingAs($user)->get(route('invoices.show', $draft))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoice.can_quote', true)
            ->where('invoice.quote', null));
});
