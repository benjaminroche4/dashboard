<?php

declare(strict_types=1);

use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a member writes the post-visit report: the visit is done, the client gets a note and the team is notified', function (): void {
    $member = User::factory()->create(['name' => 'Camille']);
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    $visit = Visit::factory()->create(['lead_id' => $lead->id, 'property_id' => $property->id, 'scheduled_at' => now()->subHours(2), 'assigned_to' => $member->id]);

    $this->actingAs($member)
        ->from(route('clients.visits'))
        ->post(route('clients.visits.report', $visit), ['report' => 'Très bon accueil, le client a apprécié la luminosité mais trouve la cuisine petite.'])
        ->assertRedirect(route('clients.visits'))
        ->assertSessionHasNoErrors();

    $visit->refresh();
    expect($visit->status)->toBe(VisitStatus::Done)
        ->and($visit->report)->toContain('Très bon accueil')
        ->and($visit->report_submitted_by)->toBe($member->id)
        ->and($visit->report_submitted_at)->not->toBeNull()
        ->and($visit->reportDue())->toBeFalse()
        ->and($lead->notes()->latest('id')->first()?->body)->toContain('Compte rendu de la visite du')->toContain('T2 lumineux · 11e')->toContain('Très bon accueil');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'visits' && str_contains((string) $event->message, 'a rédigé le compte rendu'));

    $this->actingAs($member)->post(route('clients.visits.report', $visit), ['report' => 'Court'])->assertSessionHasErrors('report');
    $this->actingAs($member)->post("/clients/visits/{$visit->id}/report", ['report' => 'Un compte rendu assez long.'])->assertNotFound();
});

test('the visits list tells which past visits still await their report', function (): void {
    $member = User::factory()->create();
    $due = Visit::factory()->create(['scheduled_at' => now()->subDay(), 'status' => VisitStatus::Done]);
    Visit::factory()->create(['scheduled_at' => now()->subDay(), 'status' => VisitStatus::Cancelled]);
    Visit::factory()->reported()->create();
    Visit::factory()->create(['scheduled_at' => now()->addDay()]);

    $this->actingAs($member)
        ->get(route('clients.visits'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/visits')
            ->has('visits', 4)
            ->where('visits', fn ($visits): bool => collect($visits)->firstWhere('id', $due->id)['report_due'] === true
                && collect($visits)->where('report_due', true)->count() === 1
                && collect($visits)->whereNotNull('report')->count() === 1));
});

test('photos taken during the visit are stored, added to the existing ones and deleted with the visit', function (): void {
    Storage::fake('public');
    $member = User::factory()->create();
    $visit = Visit::factory()->create(['lead_id' => Lead::factory()->converted(), 'scheduled_at' => now()->subHour()]);

    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Le client a aimé le séjour, réserve sur la cuisine.',
            'photos' => [UploadedFile::fake()->image('salon.jpg'), UploadedFile::fake()->image('cuisine.png')],
        ])
        ->assertSessionHasNoErrors();

    $visit->refresh();
    expect($visit->report_photos)->toHaveCount(2)
        ->and($visit->reportPhotoUrls()[0])->toContain('/storage/visit-reports/');
    Storage::disk('public')->assertExists($visit->report_photos[0]);
    // La note du client rappelle le nombre de photos.
    expect($visit->lead->notes()->first()?->body)->toContain('(2 photos)');

    // Un second envoi complète la série au lieu de l'écraser.
    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Le client a aimé le séjour, réserve sur la cuisine.',
            'photos' => [UploadedFile::fake()->image('chambre.webp')],
        ])->assertSessionHasNoErrors();

    $paths = $visit->refresh()->report_photos;
    expect($paths)->toHaveCount(3);

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('clients.visits.destroy', $visit))
        ->assertSessionHasNoErrors();

    foreach ($paths as $path) {
        Storage::disk('public')->assertMissing($path);
    }
});

test('the report refuses a file that is not an image or too big', function (): void {
    Storage::fake('public');
    $visit = Visit::factory()->create(['lead_id' => Lead::factory()->converted(), 'scheduled_at' => now()->subHour()]);

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Compte rendu suffisamment long pour passer la validation.',
            'photos' => [UploadedFile::fake()->create('plan.pdf', 100, 'application/pdf')],
        ])
        ->assertSessionHasErrors('photos.0');

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Compte rendu suffisamment long pour passer la validation.',
            'photos' => [UploadedFile::fake()->image('enorme.jpg')->size(6 * 1024)],
        ])
        ->assertSessionHasErrors('photos.0');

    expect($visit->refresh()->report)->toBeNull();
});
