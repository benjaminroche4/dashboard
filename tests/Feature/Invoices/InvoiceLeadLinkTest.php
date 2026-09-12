<?php

declare(strict_types=1);

use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Partner;
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

    $this->actingAs($manager)->get(route('invoices.create', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('prefill.subject.kind', 'lead')
            ->where('prefill.subject.id', $lead->id)
            ->where('prefill.subject.name', 'Léa Durand')
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

test('a manager links an invoice to a partner, which detaches the lead', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = Lead::factory()->create();
    $partner = Partner::factory()->create(['name' => 'Allianz Paris']);
    $invoice = Invoice::factory()->create(['number' => 'RP-27043', 'lead_id' => $lead->id]);

    $this->actingAs($manager)
        ->from(route('invoices.show', $invoice))
        ->patch(route('invoices.link', $invoice), ['partner_id' => $partner->id])
        ->assertRedirect(route('invoices.show', $invoice))
        ->assertSessionHasNoErrors();

    // Une facture est adressée à un lead ou à un partenaire, jamais aux deux.
    expect($invoice->refresh()->partner_id)->toBe($partner->id)
        ->and($invoice->lead_id)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a rattaché la facture RP-27043 au partenaire Allianz Paris'));

    $this->actingAs($manager)->get(route('invoices.show', $invoice))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoice.partner.id', $partner->id)
            ->where('invoice.partner.name', 'Allianz Paris'));

    // Détacher, puis rattacher un lead, retire le partenaire à son tour.
    $this->actingAs($manager)->patch(route('invoices.link', $invoice), ['partner_id' => null])
        ->assertSessionHasNoErrors();
    expect($invoice->refresh()->partner_id)->toBeNull();

    $this->actingAs($manager)->patch(route('invoices.link', $invoice), ['partner_id' => $partner->id]);
    $this->actingAs($manager)->patch(route('invoices.link', $invoice), ['lead_id' => $lead->id]);

    expect($invoice->refresh()->lead_id)->toBe($lead->id)
        ->and($invoice->partner_id)->toBeNull();
});

test('an unknown partner is refused', function (): void {
    $manager = User::factory()->manager()->create();
    $invoice = Invoice::factory()->create();

    $this->actingAs($manager)
        ->patch(route('invoices.link', $invoice), ['partner_id' => 999])
        ->assertSessionHasErrors('partner_id');
});
