<?php

declare(strict_types=1);

use App\Enums\DocumentUploadStatus;
use App\Enums\LeadStatus;
use App\Enums\PropertyApplicationStatus;
use App\Enums\SiteSection;
use App\Enums\VisitStatus;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Inertia\Testing\AssertableInertia;

it('gathers what the member has to do today, and nothing of the others', function (): void {
    $me = User::factory()->staff()->create();
    $other = User::factory()->staff()->create();

    // Le test se joue en milieu de journée : la tournée reste à venir.
    $this->travelTo(today()->setTime(8, 0));
    // Ma tournée : deux visites aujourd'hui, une annulée qui ne compte pas, une d'un collègue.
    Visit::factory()->create(['assigned_to' => $me->id, 'scheduled_at' => now()->setTime(14, 0)]);
    Visit::factory()->create(['assigned_to' => $me->id, 'scheduled_at' => now()->setTime(9, 30)]);
    Visit::factory()->create(['assigned_to' => $me->id, 'scheduled_at' => now()->setTime(11, 0), 'status' => VisitStatus::Cancelled]);
    Visit::factory()->create(['assigned_to' => $other->id, 'scheduled_at' => now()->setTime(16, 0)]);
    // Un compte rendu que je dois.
    Visit::factory()->create(['assigned_to' => $me->id, 'scheduled_at' => now()->subDays(2), 'status' => VisitStatus::Done]);
    // Premier contact : un lead à moi, un sans responsable, un d'un collègue.
    Lead::factory()->create(['status' => LeadStatus::Todo, 'assigned_to' => $me->id, 'last_contacted_at' => null]);
    Lead::factory()->create(['status' => LeadStatus::Todo, 'assigned_to' => null, 'last_contacted_at' => null]);
    Lead::factory()->create(['status' => LeadStatus::Todo, 'assigned_to' => $other->id, 'last_contacted_at' => null]);
    // Recontact du jour, et un pour demain.
    Lead::factory()->create(['status' => LeadStatus::InProgress, 'assigned_to' => $me->id, 'recontact_at' => today()]);
    Lead::factory()->create(['status' => LeadStatus::InProgress, 'assigned_to' => $me->id, 'recontact_at' => today()->addDay()]);
    // Une décision attendue sur un bien visité par mon client.
    $client = Lead::factory()->converted()->create(['assigned_to' => $me->id]);
    $property = Property::factory()->create();
    $client->properties()->attach($property->id, ['status' => PropertyApplicationStatus::Pending, 'status_at' => now()->subDays(3)]);
    Visit::factory()->for($client)->for($property)->create(['assigned_to' => $me->id, 'status' => VisitStatus::Done, 'scheduled_at' => now()->subDays(3)]);
    // Une pièce relue par l'assistant sur la liste de mon client.
    $request = DocumentRequest::factory()->for($client)->create();
    DocumentUpload::factory()->for($request, 'request')->create(['ai_review' => ['verdict' => 'accepted']]);
    DocumentUpload::factory()->for($request, 'request')->reviewed(DocumentUploadStatus::Accepted)->create(['ai_review' => ['verdict' => 'accepted']]);

    $this->actingAs($me)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('dashboard')
            ->has('today.visits', 2)
            ->where('today.visits.0.scheduled_at', fn (string $at): bool => str_contains($at, 'T09:30'))
            ->where('today.reports_due.total', 2)
            ->where('today.first_contacts.total', 2)
            ->where('today.recontacts.total', 1)
            ->where('today.decisions.total', 1)
            ->where('today.decisions.items.0.due', true)
            ->where('today.documents_to_review.total', 1)
            ->where('today.documents_to_review.items.0.count', 1)
            ->where('realtimeOnly', ['today']));
});

it('hides the blocks of the sections closed to the member', function (): void {
    $member = User::factory()->staff()->create(['permissions' => [SiteSection::Visits->value => 'none']]);

    $this->actingAs($member)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('today.visits', null)
            ->where('today.reports_due', null)
            ->has('today.first_contacts'));
});
