<?php

declare(strict_types=1);

use App\Enums\ClientPriority;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a client file starts with a normal priority that any member can change, which is noted and broadcast', function (): void {
    $member = User::factory()->create(['name' => 'Camille']);
    $client = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    expect($client->priority)->toBe(ClientPriority::Normal);

    $this->actingAs($member)
        ->get(route('clients.show', $client))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('client.priority', 'normal')
            ->where('client.priority_label', 'Normale')
            ->has('priorities', 4));

    $this->actingAs($member)
        ->from(route('clients.show', $client))
        ->patch(route('clients.priority', $client), ['priority' => 'urgent'])
        ->assertRedirect(route('clients.show', $client))
        ->assertSessionHasNoErrors();

    expect($client->refresh()->priority)->toBe(ClientPriority::Urgent)
        ->and($client->notes()->latest()->value('body'))->toBe('Priorité du dossier : Urgente.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'clients'
        && $event->message === 'a passé le dossier Léa Durand en priorité Urgente');

    // Même priorité : rien ne change, pas de note en double.
    $this->actingAs($member)->patch(route('clients.priority', $client), ['priority' => 'urgent'])->assertRedirect();
    expect($client->notes()->count())->toBe(1);

    $this->actingAs($member)->patch(route('clients.priority', $client), ['priority' => 'top'])->assertSessionHasErrors(['priority']);
});

test('only a converted lead has a priority, and the dossiers list the most urgent first', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->status(LeadStatus::InProgress)->create();

    $this->actingAs($member)->patch(route('clients.priority', $lead), ['priority' => 'high'])->assertNotFound();

    $low = Lead::factory()->converted()->create(['first_name' => 'Ana', 'last_name' => 'Low', 'priority' => ClientPriority::Low, 'updated_at' => now()]);
    $urgent = Lead::factory()->converted()->create(['first_name' => 'Zoé', 'last_name' => 'Urgent', 'priority' => ClientPriority::Urgent, 'updated_at' => now()->subDays(3)]);
    $normal = Lead::factory()->converted()->create(['first_name' => 'Noé', 'last_name' => 'Normal', 'updated_at' => now()->subDay()]);

    $this->actingAs($member)
        ->get(route('clients.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('clients.0.uuid', $urgent->uuid)
            ->where('clients.0.priority_label', 'Urgente')
            ->where('clients.1.uuid', $normal->uuid)
            ->where('clients.2.uuid', $low->uuid)
            ->has('priorities', 4));
});
