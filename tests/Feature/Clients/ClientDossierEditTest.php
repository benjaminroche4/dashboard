<?php

declare(strict_types=1);

use App\Enums\Furnished;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Models\Lead;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('opens the dossier edit page with its own values', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create([
        'first_name' => 'Bruno',
        'last_name' => 'Mata',
        'budget_cents' => 250000,
        'districts' => [11, 3],
    ]);

    $this->actingAs($admin)
        ->get(route('clients.edit', $lead))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/edit')
            ->where('client.first_name', 'Bruno')
            ->where('client.budget', '2500')
            ->where('client.districts', [11, 3])
            ->has('offers')
            ->has('propertyTypes'));
});

it('updates the dossier without touching the lead qualification', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create([
        'first_name' => 'Bruno',
        'last_name' => 'Mata',
        'score' => 4,
        'qualification_note' => 'Prêt à signer.',
        'assigned_to' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->patch(route('clients.update', $lead), [
            'first_name' => 'bruno',
            'last_name' => 'mata',
            'email' => 'bruno@example.com',
            'budget_cents' => 300000,
            'arrival_at' => '2026-11-01',
            'districts' => [11],
            'property_types' => [PropertyType::T2->value],
            'furnished' => Furnished::Furnished->value,
            'offer' => Offer::Accompagne->value,
        ])
        ->assertRedirect(route('clients.show', $lead));

    $lead->refresh();
    expect($lead->first_name)->toBe('Bruno')
        ->and($lead->budget_cents)->toBe(300000)
        ->and($lead->districts)->toBe([11])
        ->and($lead->furnished)->toBe(Furnished::Furnished)
        // Le dossier ne requalifie pas le lead : statut et qualification restent.
        ->and($lead->status)->toBe(LeadStatus::Converted)
        ->and($lead->score)->toBe(4)
        ->and($lead->qualification_note)->toBe('Prêt à signer.')
        ->and($lead->notes()->count())->toBe(1);
});

it('refuses a dossier without an e-mail nor a phone', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($admin)
        ->patch(route('clients.update', $lead), [
            'first_name' => 'Bruno',
            'last_name' => 'Mata',
        ])
        ->assertSessionHasErrors(['email', 'phone']);
});

it('answers 404 on a lead that is not a client yet', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->create(['status' => LeadStatus::InProgress]);

    $this->actingAs($admin)->get(route('clients.edit', $lead))->assertNotFound();
    $this->actingAs($admin)
        ->patch(route('clients.update', $lead), ['first_name' => 'Bruno', 'last_name' => 'Mata', 'email' => 'b@example.com'])
        ->assertNotFound();
});

it('routes the dossier edit by uuid and refuses the numeric id', function (): void {
    $admin = User::factory()->staff()->create();
    $lead = Lead::factory()->converted()->create();

    $this->actingAs($admin)->get('/clients/'.$lead->id.'/edit')->assertNotFound();
    $this->actingAs($admin)->get('/clients/'.$lead->uuid.'/edit')->assertOk();
});
