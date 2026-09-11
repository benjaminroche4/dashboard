<?php

declare(strict_types=1);

use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Mail\QuoteSent;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
    config()->set('services.docraptor.key');
});

test('guests are redirected and staff can list every quote, newest first', function (): void {
    $this->get(route('tools.quotes.index'))->assertRedirect(route('login'));

    Quote::factory()->count(2)->create(['issued_at' => now()->subDays(10)]);
    $latest = Quote::factory()->accepted()->create(['issued_at' => now(), 'number' => 'DV-27500']);

    $this->actingAs(User::factory()->create())
        ->get(route('tools.quotes.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('quotes/index')
            ->has('quotes', 3)
            ->where('quotes.0.number', $latest->number)
            ->where('quotes.0.status', 'accepted')
            ->where('quotes.0.status_label', 'Accepté')
            ->where('quotes.0.can_invoice', true)
            ->where('quotes.0.can_send', false)
            ->has('statuses', count(QuoteStatus::cases())));
});

test('the detail page shows the quote, its actions and its history', function (): void {
    $quote = Quote::factory()->status(QuoteStatus::Draft)->create(['number' => 'DV-27010', 'client_email' => 'c@example.ch']);
    $quote->statusChanges()->create(['from_status' => null, 'to_status' => QuoteStatus::Draft, 'note' => 'Création', 'created_at' => now()]);

    $this->actingAs(User::factory()->create())
        ->get(route('tools.quotes.show', $quote))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('quotes/show')
            ->where('quote.number', 'DV-27010')
            ->where('quote.can_send', true)
            ->where('quote.can_accept', true)
            ->where('quote.can_decline', true)
            ->where('quote.can_invoice', true)
            ->where('quote.invoice', null)
            ->has('history', 1)
            ->where('history.0.to', 'Brouillon')
            ->has('company.name')
            ->has('offers', 2));
});

test('managers send, accept, decline and invoice quotes; members cannot', function (): void {
    $manager = User::factory()->manager()->create();
    $member = User::factory()->create();

    $quote = Quote::factory()->status(QuoteStatus::Draft)->create(['client_email' => 'client@example.ch', 'number' => 'DV-27011']);
    $this->actingAs($member)->post(route('tools.quotes.send', $quote))->assertForbidden();
    $this->actingAs($manager)->from(route('tools.quotes.show', $quote))
        ->post(route('tools.quotes.send', $quote))
        ->assertRedirect(route('tools.quotes.show', $quote));
    expect($quote->fresh()->status)->toBe(QuoteStatus::Sent);
    Mail::assertQueued(QuoteSent::class);

    $this->actingAs($member)->post(route('tools.quotes.accept', $quote))->assertForbidden();
    $this->actingAs($manager)->post(route('tools.quotes.accept', $quote))->assertSessionHasNoErrors();
    expect($quote->fresh()->status)->toBe(QuoteStatus::Accepted);

    $this->actingAs($member)->post(route('tools.quotes.invoice', $quote))->assertForbidden();
    $response = $this->actingAs($manager)->post(route('tools.quotes.invoice', $quote));
    $invoice = Invoice::sole();
    $response->assertRedirect(route('invoices.show', $invoice));
    expect($quote->fresh()->status)->toBe(QuoteStatus::Invoiced)
        ->and($quote->fresh()->invoice_id)->toBe($invoice->id);

    $declined = Quote::factory()->create();
    $this->actingAs($member)->post(route('tools.quotes.decline', $declined), ['reason' => 'x'])->assertForbidden();
    $this->actingAs($manager)->post(route('tools.quotes.decline', $declined), ['reason' => 'Trop cher'])->assertSessionHasNoErrors();
    expect($declined->fresh()->status)->toBe(QuoteStatus::Declined)
        ->and($declined->statusChanges()->latest('id')->first()?->note)->toBe('Trop cher');
});

test('a forbidden transition answers with a validation error instead of a crash', function (): void {
    $quote = Quote::factory()->status(QuoteStatus::Declined)->create();

    $this->actingAs(User::factory()->manager()->create())
        ->from(route('tools.quotes.show', $quote))
        ->post(route('tools.quotes.invoice', $quote))
        ->assertRedirect(route('tools.quotes.show', $quote))
        ->assertSessionHasErrors('status');

    expect(Invoice::count())->toBe(0);
});

test('the detail page links the invoice once the quote is invoiced', function (): void {
    $invoice = Invoice::factory()->create(['number' => 'RP-27077']);
    $quote = Quote::factory()->status(QuoteStatus::Invoiced)->create(['invoice_id' => $invoice->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('tools.quotes.show', $quote))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('quote.invoice.number', 'RP-27077')
            ->where('quote.can_send', false)
            ->where('quote.can_invoice', false));
});

test('the scheduled command expires stale quotes', function (): void {
    Quote::factory()->create(['valid_until' => now()->subDay()]);

    $this->artisan('quotes:mark-expired')->expectsOutput('1 devis expiré(s).')->assertSuccessful();
    $this->artisan('quotes:mark-expired')->expectsOutput('Aucun devis expiré.')->assertSuccessful();
});
