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
            ->where('invoices.0.uuid', $latest->uuid)
            ->where('invoices.0.status', 'paid')
            ->where('invoices.0.status_label', 'Payée')
            ->where('pagination.total', 4)
            ->where('pagination.last_page', 1)
            ->where('filters.sort', 'issued_at')
            ->where('filters.dir', 'desc')
            ->has('statuses', count(InvoiceStatus::cases())));
});

test('the list is paginated by 50 on the server, searched by number or client, filtered by status and sorted', function (): void {
    Invoice::factory()->count(60)->create(['client_name' => 'Client', 'issued_at' => now()->subMonth()]);
    $target = Invoice::factory()->overdue()->create(['client_name' => 'Nestlé Suisse', 'number' => 'RP-27999', 'issued_at' => now()]);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->get(route('invoices.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('invoices', 50)
            ->where('pagination.total', 61)
            ->where('pagination.last_page', 2)
            ->where('overdueCount', 1));

    $this->actingAs($member)
        ->get(route('invoices.index', ['page' => 2]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('invoices', 11)->where('pagination.current_page', 2));

    $this->actingAs($member)
        ->get(route('invoices.index', ['q' => 'nestlé']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('invoices', 1)->where('invoices.0.uuid', $target->uuid)->where('filters.q', 'nestlé'));
    $this->actingAs($member)
        ->get(route('invoices.index', ['q' => '27999']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('invoices', 1));
    $this->actingAs($member)
        ->get(route('invoices.index', ['status' => 'overdue']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('invoices', 1)->where('filters.status', 'overdue'));
    $this->actingAs($member)
        ->get(route('invoices.index', ['sort' => 'client_name', 'dir' => 'asc']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('invoices.0.client_name', 'Client')->where('filters.sort', 'client_name')->where('filters.dir', 'asc'));
    $this->actingAs($member)
        ->get(route('invoices.index', ['sort' => 'password', 'status' => 'lost']))
        ->assertSessionHasErrors(['sort', 'status']);
});
