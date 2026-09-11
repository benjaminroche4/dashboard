<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Enums\QuoteStatus;
use App\Mail\InvoiceSent;
use App\Mail\QuoteSent;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

/** Dossier à deux locataires : Bruno principal, Charles en second. */
function household(): Lead
{
    return Lead::factory()->create([
        'first_name' => 'Bruno',
        'last_name' => 'Mata',
        'email' => 'bruno@example.com',
        'co_first_name' => 'Charles',
        'co_last_name' => 'Mata',
        'co_email' => 'charles@example.com',
        'company' => null,
    ]);
}

test('an invoice and a quote created from a household prefill both first names', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = household();

    $this->actingAs($manager)->get(route('invoices.create', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('prefill.client_name', 'Bruno & Charles')
            ->where('prefill.client_email', 'bruno@example.com'));

    $this->actingAs($manager)->get(route('tools.quotes.create', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('prefill.client_name', 'Bruno & Charles'));
});

test('the company keeps priority over the household name', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = household();
    $lead->forceFill(['company' => 'Nestlé'])->save();

    $this->actingAs($manager)->get(route('invoices.create', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('prefill.client_name', 'Nestlé'));
});

test('sending an invoice copies the second tenant of the dossier', function (): void {
    Mail::fake();
    $manager = User::factory()->manager()->create();
    $lead = household();
    $invoice = Invoice::factory()->create([
        'lead_id' => $lead->id,
        'client_name' => 'Bruno & Charles',
        'client_email' => 'bruno@example.com',
        'status' => InvoiceStatus::Draft,
    ]);

    $this->actingAs($manager)->post(route('invoices.send', $invoice))->assertRedirect();

    Mail::assertQueued(InvoiceSent::class, fn (InvoiceSent $mail): bool => $mail->hasTo('bruno@example.com')
        && $mail->hasCc('charles@example.com'));
});

test('sending a quote copies the second tenant, and nobody twice', function (): void {
    Mail::fake();
    $manager = User::factory()->manager()->create();
    $lead = household();
    $quote = Quote::factory()->create([
        'lead_id' => $lead->id,
        'client_name' => 'Bruno & Charles',
        'client_email' => 'bruno@example.com',
        'status' => QuoteStatus::Draft,
    ]);

    $this->actingAs($manager)->post(route('tools.quotes.send', $quote))->assertRedirect();

    Mail::assertQueued(QuoteSent::class, fn (QuoteSent $mail): bool => $mail->hasTo('bruno@example.com')
        && $mail->hasCc('charles@example.com')
        // Le destinataire principal n'est jamais aussi en copie.
        && ! $mail->hasCc('bruno@example.com'));
});

test('an invoice without a dossier is sent to its client alone', function (): void {
    Mail::fake();
    $manager = User::factory()->manager()->create();
    $invoice = Invoice::factory()->create([
        'lead_id' => null,
        'client_email' => 'societe@example.com',
        'status' => InvoiceStatus::Draft,
    ]);

    $this->actingAs($manager)->post(route('invoices.send', $invoice))->assertRedirect();

    Mail::assertQueued(InvoiceSent::class, fn (InvoiceSent $mail): bool => $mail->hasTo('societe@example.com')
        && ! $mail->hasCc('societe@example.com'));
});
