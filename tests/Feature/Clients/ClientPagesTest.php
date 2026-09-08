<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Enums\LeadStatus;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadStatusChange;
use App\Models\Property;
use App\Models\Quote;
use App\Models\User;
use App\Models\Visit;
use Inertia\Testing\AssertableInertia;

test('the clients page lists only converted leads, newest conversion first, with their follow-up data', function (): void {
    $this->get(route('clients.index'))->assertRedirect(route('login'));

    $member = User::factory()->create(['name' => 'Camille']);
    $older = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'assigned_to' => $member->id]);
    $newer = Lead::factory()->converted()->create(['first_name' => 'Noah', 'last_name' => 'Martin']);
    Lead::factory()->status(LeadStatus::InProgress)->create(['first_name' => 'Pas', 'last_name' => 'Client']);

    LeadStatusChange::query()->create(['lead_id' => $older->id, 'from_status' => LeadStatus::QuoteSent, 'to_status' => LeadStatus::Converted, 'created_at' => now()->subDays(5)]);
    LeadStatusChange::query()->create(['lead_id' => $newer->id, 'from_status' => LeadStatus::QuoteSent, 'to_status' => LeadStatus::Converted, 'created_at' => now()->subDay()]);

    $this->actingAs($member)
        ->get(route('clients.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/index')
            ->has('clients', 2)
            ->where('clients.0.name', 'Noah Martin')
            ->where('clients.0.uuid', $newer->uuid)
            ->where('clients.1.name', 'Léa Durand')
            ->where('clients.1.assignee.name', 'Camille')
            ->where('clients.1.invoices_count', 0)
            ->where('clients.1.document_requests_count', 0)
            ->where('realtimeOnly', ['clients']));
});

test('the visits page renders for the team and is private', function (): void {
    $this->get(route('clients.visits'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('clients/visits'));
});

test('a client file shows the converted lead with its invoices, quotes, documents, partners and notes', function (): void {
    $member = User::factory()->create(['name' => 'Camille']);
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'assigned_to' => $member->id]);
    Invoice::factory()->paid()->create(['lead_id' => $client->id, 'currency' => 'EUR', 'amount_cents' => 100_000]);
    Invoice::factory()->create(['lead_id' => $client->id, 'currency' => 'EUR', 'amount_cents' => 50_000, 'deposit_cents' => 10_000]);
    Invoice::factory()->status(InvoiceStatus::Cancelled)->create(['lead_id' => $client->id, 'currency' => 'EUR', 'amount_cents' => 999_999]);
    Quote::factory()->create(['lead_id' => $client->id, 'number' => 'DV-27009']);
    $client->notes()->create(['body' => 'Visite lundi.', 'user_id' => $member->id]);
    Visit::factory()->create(['lead_id' => $client->id, 'property_id' => Property::factory()->create(['title' => 'T2 lumineux · 11e'])->id]);

    $this->actingAs($member)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/show')
            ->where('client.name', 'Léa Durand')
            ->where('client.assignee.name', 'Camille')
            ->has('client.language_label')
            ->has('totals', 1)
            ->where('totals.0.currency', 'EUR')
            ->where('totals.0.invoiced_cents', 150_000)
            ->where('totals.0.paid_cents', 100_000)
            ->where('totals.0.due_cents', 40_000)
            ->has('invoices', 3)
            ->has('quotes', 1)
            ->where('quotes.0.number', 'DV-27009')
            ->has('documentRequests', 0)
            ->has('partners', 0)
            ->has('notes', 1)
            ->where('notes.0.by', 'Camille')
            ->has('visits', 1)
            ->where('visits.0.property.label', 'T2 lumineux · 11e')
            ->where('visits.0.client.name', 'Léa Durand'));
});

test('only converted leads have a client file, addressed by uuid', function (): void {
    $lead = Lead::factory()->status(LeadStatus::InProgress)->create();
    $client = Lead::factory()->converted()->create();

    $this->get(route('clients.show', $client))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())->get(route('clients.show', $lead))->assertNotFound();
    $this->actingAs(User::factory()->create())->get('/clients/'.$client->id)->assertNotFound();
});
