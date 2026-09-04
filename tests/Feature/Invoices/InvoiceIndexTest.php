<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests are redirected to the login page', function (): void {
    $this->get(route('invoices.index'))->assertRedirect(route('login'));
});

test('staff can list every invoice, newest first', function (): void {
    Invoice::factory()->count(3)->create(['issued_at' => now()->subDays(10)]);
    $latest = Invoice::factory()->paid()->create(['issued_at' => now(), 'number' => 'RP-27500']);

    $this->actingAs(User::factory()->create())
        ->get(route('invoices.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('invoices/index')
            ->has('invoices', 4)
            ->where('invoices.0.number', $latest->number)
            ->where('invoices.0.status', 'paid')
            ->where('invoices.0.status_label', 'Payée')
            ->has('statuses', count(InvoiceStatus::cases())));
});
