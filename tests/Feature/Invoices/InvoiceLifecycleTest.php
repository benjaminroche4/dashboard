<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Mail\InvoiceSent;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
    config()->set('services.docraptor.key');
});

test('the detail page shows the invoice, its totals and its history', function (): void {
    $invoice = Invoice::factory()->status(InvoiceStatus::Draft)->create(['number' => 'RP-27010', 'deposit_cents' => 10_000]);
    $invoice->statusChanges()->create(['from_status' => null, 'to_status' => InvoiceStatus::Draft, 'note' => 'Création', 'created_at' => now()]);

    $this->actingAs(User::factory()->create())
        ->get(route('invoices.show', $invoice))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('invoices/show')
            ->where('invoice.number', 'RP-27010')
            ->where('invoice.deposit_cents', 10_000)
            ->where('invoice.due_cents', $invoice->amount_cents - 10_000)
            ->where('invoice.can_send', true)
            ->where('invoice.can_pay', false)
            ->has('history', 1)
            ->where('history.0.to', 'Brouillon')
            ->has('company.name')
            ->has('offers', 2));
});

test('managers send an invoice from the detail page', function (): void {
    $invoice = Invoice::factory()->status(InvoiceStatus::Draft)->create(['client_email' => 'client@example.ch']);

    $this->actingAs(User::factory()->manager()->create())
        ->from(route('invoices.show', $invoice))
        ->post(route('invoices.send', $invoice))
        ->assertRedirect(route('invoices.show', $invoice));

    expect($invoice->fresh()->status)->toBe(InvoiceStatus::Sent);
    Mail::assertSent(InvoiceSent::class);
});

test('members cannot send or pay invoices', function (): void {
    $invoice = Invoice::factory()->create(['client_email' => 'client@example.ch']);
    $member = User::factory()->role(StaffRole::Member)->create();

    $this->actingAs($member)->post(route('invoices.send', $invoice))->assertForbidden();
    $this->actingAs($member)->post(route('invoices.pay', $invoice), ['paid_at' => now()->toDateString()])->assertForbidden();
});

test('managers mark a sent invoice paid with a date, not in the future', function (): void {
    $invoice = Invoice::factory()->create();
    $manager = User::factory()->manager()->create();

    $this->actingAs($manager)
        ->from(route('invoices.index'))
        ->post(route('invoices.pay', $invoice), ['paid_at' => now()->addDay()->toDateString()])
        ->assertSessionHasErrors('paid_at');

    $this->actingAs($manager)
        ->from(route('invoices.index'))
        ->post(route('invoices.pay', $invoice), ['paid_at' => now()->toDateString()])
        ->assertRedirect(route('invoices.index'));

    expect($invoice->fresh()->status)->toBe(InvoiceStatus::Paid);
});

test('the list exposes the available actions per invoice', function (): void {
    Invoice::factory()->status(InvoiceStatus::Draft)->create(['client_email' => 'c@example.ch']);
    Invoice::factory()->paid()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('invoices.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoices.0.can_send', fn ($value): bool => is_bool($value))
            ->where('invoices.0.can_pay', fn ($value): bool => is_bool($value)));
});
