<?php

declare(strict_types=1);

use App\Enums\PropertyApplicationStatus;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Mail\VisitReportSent;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
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
        ->post(route('clients.visits.report', $visit), ['verdict' => 'consider', 'report' => 'Très bon accueil, le client a apprécié la luminosité mais trouve la cuisine petite.'])
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

    $this->actingAs($member)->post(route('clients.visits.report', $visit), ['verdict' => 'consider', 'report' => 'Court'])->assertSessionHasErrors('report');
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
            'verdict' => 'consider', 'report' => 'Le client a aimé le séjour, réserve sur la cuisine.',
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
            'verdict' => 'consider', 'report' => 'Le client a aimé le séjour, réserve sur la cuisine.',
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
            'verdict' => 'consider', 'report' => 'Compte rendu suffisamment long pour passer la validation.',
            'photos' => [UploadedFile::fake()->create('plan.pdf', 100, 'application/pdf')],
        ])
        ->assertSessionHasErrors('photos.0');

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.report', $visit), [
            'verdict' => 'consider', 'report' => 'Compte rendu suffisamment long pour passer la validation.',
            'photos' => [UploadedFile::fake()->image('enorme.jpg')->size(6 * 1024)],
        ])
        ->assertSessionHasErrors('photos.0');

    expect($visit->refresh()->report)->toBeNull();
});

test('the report can be e-mailed to the client, to the whole household', function (): void {
    Mail::fake();
    Storage::fake('public');

    $member = User::factory()->create();
    $second = User::factory()->create();
    $lead = Lead::factory()->converted()->create([
        'first_name' => 'Anne',
        'last_name' => 'Delahaye',
        'email' => 'anne@example.com',
        'co_first_name' => 'Bruno',
        'co_last_name' => 'Delahaye',
        'co_email' => 'bruno@example.com',
        'assigned_to' => $second->id,
    ]);
    $visit = Visit::factory()->for($lead)->create(['scheduled_at' => now()->subDay()]);

    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), [
            'verdict' => 'consider', 'report' => 'Le client a beaucoup aimé la lumière, réserve sur le vis-à-vis.',
            'photos' => [UploadedFile::fake()->image('salon.jpg')],
            'notify_client' => true,
        ])
        ->assertSessionHasNoErrors();

    // Les deux locataires reçoivent, le membre du suivi est en copie.
    Mail::assertQueued(VisitReportSent::class, fn (VisitReportSent $mail): bool => $mail->hasTo('anne@example.com')
        && $mail->hasTo('bruno@example.com')
        && $mail->hasCc($second->email));

    // L'envoi est tracé sur le dossier et compte comme un contact.
    expect($lead->fresh()->notes()->latest('id')->value('body'))
        ->toContain('Compte rendu de visite envoyé à')
        ->and($lead->fresh()->last_contacted_at)->not->toBeNull();
});

test('nothing is sent without asking, nor without an address', function (): void {
    Mail::fake();
    Storage::fake('public');

    $member = User::factory()->create();

    // Case décochée : rien ne part. (La visite est passée : sinon le compte
    // rendu ne se débloque pas.)
    $visit = Visit::factory()->for(Lead::factory()->converted()->create(['email' => 'lea@example.com']))->create(['scheduled_at' => now()->subHour()]);
    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), ['verdict' => 'consider', 'report' => 'Visite correcte, sans plus.'])
        ->assertSessionHasNoErrors();
    Mail::assertNotQueued(VisitReportSent::class);

    // Case cochée mais aucun e-mail sur le dossier : rien ne part non plus.
    $mute = Visit::factory()->for(Lead::factory()->converted()->create(['email' => null, 'co_email' => null]))->create(['scheduled_at' => now()->subHour()]);
    $this->actingAs($member)
        ->post(route('clients.visits.report', $mute), ['verdict' => 'consider', 'report' => 'Visite correcte, sans plus.', 'notify_client' => true])
        ->assertSessionHasNoErrors();
    Mail::assertNotQueued(VisitReportSent::class);
});

test('the report unlocks only after the visit: a future one is refused', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->converted()->create();
    $future = Visit::factory()->create(['lead_id' => $lead->id, 'scheduled_at' => now()->addDay(), 'assigned_to' => $member->id]);

    expect($future->reportable())->toBeFalse();

    $this->actingAs($member)
        ->post(route('clients.visits.report', $future), ['verdict' => 'consider', 'report' => 'Le client a beaucoup aimé le quartier.'])
        ->assertSessionHasErrors('report');

    expect($future->refresh()->report)->toBeNull()
        ->and($future->status)->toBe(VisitStatus::Planned);

    // Passé l'heure, la même visite se raconte.
    $future->forceFill(['scheduled_at' => now()->subMinute()])->save();

    $this->actingAs($member)
        ->post(route('clients.visits.report', $future), ['verdict' => 'consider', 'report' => 'Le client a beaucoup aimé le quartier.'])
        ->assertSessionHasNoErrors();

    expect($future->refresh()->report)->toContain('le quartier');
});

test('a cancelled visit expects no report, but an existing one stays editable', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->converted()->create();
    $cancelled = Visit::factory()->create([
        'lead_id' => $lead->id,
        'scheduled_at' => now()->subDay(),
        'status' => VisitStatus::Cancelled,
        'assigned_to' => $member->id,
    ]);

    expect($cancelled->reportable())->toBeFalse();

    $this->actingAs($member)
        ->post(route('clients.visits.report', $cancelled), ['verdict' => 'consider', 'report' => 'Rien à signaler sur cette visite.'])
        ->assertSessionHasErrors('report');

    // Un compte rendu déjà écrit reste modifiable, même après une annulation.
    $cancelled->forceFill(['report' => 'Premier jet du compte rendu.'])->save();

    expect($cancelled->reportable())->toBeTrue();

    $this->actingAs($member)
        ->post(route('clients.visits.report', $cancelled), ['verdict' => 'consider', 'report' => 'Compte rendu corrigé après coup.'])
        ->assertSessionHasNoErrors();

    expect($cancelled->refresh()->report)->toBe('Compte rendu corrigé après coup.');
});

test('the summary tells the front whether the report can be written', function (): void {
    $lead = Lead::factory()->converted()->create();
    Visit::factory()->create(['lead_id' => $lead->id, 'scheduled_at' => now()->addDay()]);
    Visit::factory()->create(['lead_id' => $lead->id, 'scheduled_at' => now()->subDay()]);

    $this->actingAs(User::factory()->create())
        ->get(route('clients.visits'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/visits')
            ->where('visits', fn ($visits): bool => collect($visits)->pluck('can_report')->sort()->values()->all() === [false, true])
            ->etc());
});

test('the next step chosen on the report updates the follow-up of the property', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->converted()->create();
    $property = Property::factory()->create(['title' => 'T2 lumineux · 11e']);
    $visit = Visit::factory()->create([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'scheduled_at' => now()->subHours(2),
    ]);

    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Le client est emballé, on dépose le dossier.',
            'next_status' => PropertyApplicationStatus::Applied->value,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    // Le bien est rattaché au dossier s'il ne l'était pas, avec son étape.
    $link = $lead->refresh()->properties()->firstWhere('properties.id', $property->id);

    expect($link)->not->toBeNull()
        ->and($link?->getRelationValue('pivot')->status)->toBe(PropertyApplicationStatus::Applied);
});

test('the next step is optional: a report can be written before deciding', function (): void {
    $member = User::factory()->create();
    $visit = Visit::factory()->create(['scheduled_at' => now()->subHours(2)]);

    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), ['report' => 'Visite faite, le client réfléchit.'])
        ->assertSessionHasNoErrors();

    expect($visit->refresh()->report)->toContain('réfléchit')
        ->and($visit->lead->properties()->count())->toBe(0);

    // Une étape inventée, elle, est refusée.
    $this->actingAs($member)
        ->post(route('clients.visits.report', $visit), ['report' => 'Visite faite, le client réfléchit.', 'next_status' => 'peut-etre'])
        ->assertSessionHasErrors('next_status');
});
