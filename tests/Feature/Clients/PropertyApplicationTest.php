<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\PropertyApplicationStatus;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('after a visit the client positions himself, then the application is settled', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create(['title' => 'T2 lumineux']);
    $client->properties()->attach($property->id, ['created_by' => $member->id]);

    $url = route('clients.properties.status', ['lead' => $client, 'property' => $property]);

    // Par défaut, rien n'est décidé.
    expect($client->properties()->first()?->getRelationValue('pivot')->status)
        ->toBe(PropertyApplicationStatus::Pending);

    $this->actingAs($member)->from(route('clients.show', $client))
        ->patch($url, ['status' => 'applied'])->assertRedirect(route('clients.show', $client));

    expect($client->properties()->first()?->getRelationValue('pivot')->status)
        ->toBe(PropertyApplicationStatus::Applied)
        ->and($client->properties()->first()?->getRelationValue('pivot')->status_at)->not->toBeNull()
        ->and($client->notes()->latest('id')->value('body'))->toBe('T2 lumineux : Dossier déposé.');

    $this->actingAs($member)->patch($url, ['status' => 'accepted'])->assertRedirect();

    expect($client->properties()->first()?->getRelationValue('pivot')->status)
        ->toBe(PropertyApplicationStatus::Accepted);

    Event::assertDispatched(DashboardUpdated::class);
});

test('deciding from a visit links the property to the dossier if it was not', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create();
    // Un bien visité n'est pas forcément rattaché au dossier.
    $property = Property::factory()->create();
    Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $property->id]);

    expect($client->properties()->count())->toBe(0);

    $this->actingAs($member)
        ->from(route('clients.show', $client))
        ->patch(route('clients.properties.status', ['lead' => $client, 'property' => $property]), ['status' => 'declined'])
        ->assertRedirect();

    expect($client->properties()->count())->toBe(1)
        ->and($client->properties()->first()?->getRelationValue('pivot')->status)
        ->toBe(PropertyApplicationStatus::Declined);
});

test('the dossier counts what is out of the running and the applications in play', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create();

    foreach (['declined', 'rejected', 'applied', 'accepted', 'pending'] as $status) {
        $client->properties()->attach(Property::factory()->create()->id, ['status' => $status]);
    }

    Visit::factory()->create(['lead_id' => $client->id, 'status' => VisitStatus::Done]);

    $this->actingAs($member)
        ->get(route('clients.show', $client))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('progress.visits_done', 1)
            // Écarté par le client ou refusé par le bailleur : le bien est hors course.
            ->where('progress.properties_refused', 2)
            ->where('progress.applications', 2)
            ->has('propertyStatuses', 5));
});

test('the visit page carries the follow-up, and an unknown step is refused', function (): void {
    $member = User::factory()->create();
    $client = Lead::factory()->converted()->create();
    $property = Property::factory()->create();
    $client->properties()->attach($property->id, ['status' => 'applied']);
    $visit = Visit::factory()->create(['lead_id' => $client->id, 'property_id' => $property->id]);

    $this->actingAs($member)
        ->get(route('clients.visits.show', $visit))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('outcome.status', 'applied')
            ->where('outcome.status_label', 'Dossier déposé')
            ->has('outcome.options', 5));

    $this->actingAs($member)
        ->from(route('clients.visits.show', $visit))
        ->patch(route('clients.properties.status', ['lead' => $client, 'property' => $property]), ['status' => 'peut-etre'])
        ->assertSessionHasErrors('status');
});

test('the follow-up needs a converted lead', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->create(['status' => LeadStatus::InProgress]);
    $property = Property::factory()->create();

    $this->actingAs($member)
        ->patch(route('clients.properties.status', ['lead' => $lead, 'property' => $property]), ['status' => 'applied'])
        ->assertNotFound();
});
