<?php

declare(strict_types=1);

use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('a manager links an invoice to a lead, both pages show it, and can unlink', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $invoice = Invoice::factory()->create(['number' => 'RP-27042']);

    $this->actingAs($manager)
        ->from(route('invoices.show', $invoice))
        ->patch(route('invoices.link', $invoice), ['lead_id' => $lead->id])
        ->assertRedirect(route('invoices.show', $invoice))
        ->assertSessionHasNoErrors();

    expect($invoice->refresh()->lead_id)->toBe($lead->id)
        ->and($lead->notes()->first()?->body)->toContain('RP-27042');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a rattaché la facture RP-27042 au lead Léa Durand'));

    $this->actingAs($manager)->get(route('invoices.show', $invoice))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoice.lead.id', $lead->id)
            ->where('invoice.lead.name', 'Léa Durand'));
    $this->actingAs($manager)->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('invoices', 1)
            ->where('invoices.0.number', 'RP-27042'));
    $this->actingAs($manager)->get(route('invoices.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('invoices.0.lead.name', 'Léa Durand'));

    $this->actingAs($manager)
        ->patch(route('invoices.link', $invoice), ['lead_id' => null])
        ->assertSessionHasNoErrors();
    expect($invoice->refresh()->lead_id)->toBeNull()
        ->and($lead->notes()->count())->toBe(2);
});

test('the lead must exist and members cannot link', function (): void {
    $manager = User::factory()->manager()->create();
    $invoice = Invoice::factory()->create();

    $this->actingAs($manager)->from(route('invoices.show', $invoice))
        ->patch(route('invoices.link', $invoice), ['lead_id' => 999])
        ->assertSessionHasErrors('lead_id');

    $member = User::factory()->create();
    $this->actingAs($member)
        ->patch(route('invoices.link', $invoice), ['lead_id' => Lead::factory()->create()->id])
        ->assertForbidden();
});

test('invoices can be searched by number or client to link them from a lead', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    Invoice::factory()->create(['number' => 'RP-27100', 'client_name' => 'Nestlé', 'lead_id' => $lead->id]);
    Invoice::factory()->create(['number' => 'RP-27101', 'client_name' => 'Autre']);

    $this->actingAs($user)->getJson(route('invoices.search', ['q' => 'nest']))
        ->assertOk()->assertJsonCount(1)->assertJsonPath('0.number', 'RP-27100')->assertJsonPath('0.lead.name', 'Léa Durand');
    $this->actingAs($user)->getJson(route('invoices.search', ['q' => '27101']))
        ->assertJsonCount(1)->assertJsonPath('0.lead', null);
    $this->actingAs($user)->getJson(route('invoices.search'))->assertExactJson([]);
});

test('creating an invoice from a lead prefills the client and links it', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'company' => 'Nestlé', 'offer' => Offer::Confie]);

    $this->actingAs($manager)->get(route('invoices.create', ['lead' => $lead->id]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('prefill.lead_id', $lead->id)
            ->where('prefill.lead_name', 'Léa Durand')
            ->where('prefill.client_name', 'Nestlé')
            ->where('prefill.client_email', 'lea@example.com')
            ->where('prefill.offer', 'confie'));
    $this->actingAs($manager)->get(route('invoices.create'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('prefill', null));

    $this->actingAs($manager)->post(route('invoices.store'), [
        'lead_id' => $lead->id,
        'client_name' => 'Nestlé',
        'client_email' => 'lea@example.com',
        'currency' => 'EUR',
        'vat_rate' => 8.1,
        'issued_at' => '2026-09-05',
        'due_at' => '2026-10-05',
        'items' => [['offer' => 'confie', 'quantity' => 1, 'unit_price_cents' => 219000]],
    ])->assertSessionHasNoErrors();

    expect(Invoice::query()->latest('id')->first()?->lead_id)->toBe($lead->id);
});
