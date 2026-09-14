<?php

declare(strict_types=1);

use App\Enums\ClientClosingReason;
use App\Enums\LeadStatus;
use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

it('closes a dossier: archived on the kanban, kept in the archived dossiers with its reason', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($admin)
        ->post(route('clients.close', $lead), ['reason' => ClientClosingReason::Installed->value, 'note' => 'Bail signé le 12.'])
        ->assertRedirect();

    $lead->refresh();
    expect($lead->status)->toBe(LeadStatus::Archived)
        ->and($lead->closing_reason)->toBe(ClientClosingReason::Installed)
        ->and($lead->closing_note)->toBe('Bail signé le 12.')
        ->and($lead->closed_at)->not->toBeNull()
        ->and($lead->isClient())->toBeTrue()
        // Le motif de perte d'un lead n'a rien à faire ici.
        ->and($lead->loss_reason)->toBeNull()
        ->and($lead->notes()->latest('id')->value('body'))->toBe('Dossier clôturé : Client installé — Bail signé le 12..');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients' && str_contains((string) $event->message, 'a clôturé le dossier Léa Durand'));
});

it('requires a reason, and refuses to close a dossier that is not a client', function (): void {
    $admin = User::factory()->staff()->create();
    $client = Lead::factory()->converted()->create();
    $lead = Lead::factory()->create(['status' => LeadStatus::InProgress]);

    $this->actingAs($admin)->post(route('clients.close', $client), [])->assertSessionHasErrors('reason');
    $this->actingAs($admin)->post(route('clients.close', $lead), ['reason' => 'installed'])->assertNotFound();
});

it('hides closed dossiers from the list until asked, and still opens their page', function (): void {
    $admin = User::factory()->staff()->create();
    $open = Lead::factory()->converted()->create();
    $closed = Lead::factory()->converted()->create();
    $this->actingAs($admin)->post(route('clients.close', $closed), ['reason' => 'withdrawn'])->assertRedirect();

    $this->actingAs($admin)
        ->get(route('clients.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('clients', 1)
            ->where('clients.0.uuid', $open->uuid)
            ->where('archived.loaded', false)
            ->where('archived.count', 1)
            ->has('closingReasons', 4));

    $this->actingAs($admin)
        ->get(route('clients.index', ['archived' => 1]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('clients', 2)
            ->where('archived.loaded', true));

    // La fiche du dossier clôturé se lit encore : il reste un client, sous la section Clients.
    $this->actingAs($admin)
        ->get(route('clients.show', $closed))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('client.closing_reason_label', 'Client parti ou sans suite')
            ->whereNot('client.closed_at', null));

    // Mais il ne se modifie plus.
    $this->actingAs($admin)->patch(route('clients.priority', $closed), ['priority' => 'high'])->assertNotFound();
});

it('reopens a closed dossier as a followed client', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();
    $this->actingAs($admin)->post(route('clients.close', $lead), ['reason' => 'other'])->assertRedirect();

    $this->actingAs($admin)->post(route('clients.reopen', $lead))->assertRedirect();

    $lead->refresh();
    expect($lead->status)->toBe(LeadStatus::Converted)
        ->and($lead->closed_at)->toBeNull()
        ->and($lead->closing_reason)->toBeNull();

    // Un dossier ouvert ne se « rouvre » pas.
    $this->actingAs($admin)->post(route('clients.reopen', $lead))->assertNotFound();
});

it('keeps a closed dossier readable by a member who only has the Clients section', function (): void {
    $member = User::factory()->staff()->create(['permissions' => [SiteSection::Leads->value => 'none', SiteSection::OwnerLeads->value => 'none']]);
    $lead = Lead::factory()->converted()->create();
    $this->actingAs(User::factory()->staff()->create())->post(route('clients.close', $lead), ['reason' => 'installed'])->assertRedirect();

    $this->actingAs($member)->get(route('clients.show', $lead))->assertOk();
});
