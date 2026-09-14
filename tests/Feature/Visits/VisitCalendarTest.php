<?php

declare(strict_types=1);

use App\Actions\Visits\DeleteVisit;
use App\Actions\Visits\ScheduleVisit;
use App\Actions\Visits\UpdateVisit;
use App\Data\VisitData;
use App\Data\VisitUpdateData;
use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    config()->set('company.mail.sender_domains', ['relocation-in-paris.fr']);

    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $pem);
    config()->set('services.google.calendar_key_file', base64_encode((string) json_encode(['client_email' => 'bot@project.iam.gserviceaccount.com', 'private_key' => $pem])));
    config()->set('services.google.calendar_organizer', 'contact@relocation-in-paris.fr');
});

/** Google répond : jeton, puis l'événement (ou une panne). */
function fakeGoogle(int $status = 200): void
{
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.test']),
        'www.googleapis.com/calendar/v3/*' => Http::response($status === 200 ? ['id' => 'evt_visit_1'] : [], $status),
    ]);
}

/** Un membre sur le domaine Workspace : il a un agenda à tenir. */
function agendaMember(string $name = 'Charles Martin', string $email = 'charles@relocation-in-paris.fr'): User
{
    return User::factory()->staff()->create(['name' => $name, 'email' => $email]);
}

function bookVisit(?User $member, string $when = '2026-10-14 10:00'): Visit
{
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'phone' => '+33 6 12 34 56 78']);
    // Sans titre : le bien se nomme par sa rue, ce que l'agenda reprend.
    $property = Property::factory()->create(['title' => null, 'street' => '12 rue de Richelieu', 'postal_code' => '75001', 'city' => 'Paris']);

    return resolve(ScheduleVisit::class)->handle(VisitData::from([
        'lead_id' => $lead->id,
        'property_id' => $property->id,
        'assigned_to' => $member?->id,
        'scheduled_at' => $when,
        'mode' => VisitMode::ForClient->value,
    ]), $member);
}

it('books a 30-minute event at the property address in the agenda of the member who visits', function (): void {
    fakeGoogle();
    $charles = agendaMember();

    $visit = bookVisit($charles);

    expect($visit->refresh()->calendar_event_id)->toBe('evt_visit_1')
        ->and($visit->calendar_email)->toBe('charles@relocation-in-paris.fr');

    Http::assertSent(function ($request) use ($visit): bool {
        if ($request->method() !== 'POST' || ! str_contains($request->url(), '/calendars/primary/events')) {
            return false;
        }
        $body = $request->data();

        return $body['summary'] === 'Visite · Léa Durand — 12 rue de Richelieu'
            && $body['location'] === '12 rue de Richelieu, 75001 Paris'
            && $body['start']['dateTime'] === '2026-10-14T10:00:00'
            && $body['end']['dateTime'] === '2026-10-14T10:30:00'
            && $body['attendees'] === [['email' => 'charles@relocation-in-paris.fr']]
            && str_contains((string) $body['description'], route('clients.visits.show', $visit))
            && ! isset($body['conferenceData']);
    });
});

it('keeps no event without a member, or for a member outside the Workspace domain', function (): void {
    fakeGoogle();
    $visit = bookVisit(null);
    expect($visit->refresh()->calendar_event_id)->toBeNull();

    $outside = agendaMember('Ana', 'ana@gmail.com');
    $visit = bookVisit($outside);
    expect($visit->refresh()->calendar_event_id)->toBeNull();

    Http::assertNotSent(fn ($request): bool => $request->method() === 'POST' && str_contains($request->url(), '/events'));
});

it('moves the event when the visit is rescheduled and removes it when cancelled', function (): void {
    fakeGoogle();
    $charles = agendaMember();
    $visit = bookVisit($charles);

    resolve(UpdateVisit::class)->handle($visit, VisitUpdateData::from(['scheduled_at' => '2026-10-15 16:00']));

    Http::assertSent(fn ($request): bool => $request->method() === 'PATCH'
        && str_contains($request->url(), '/events/evt_visit_1')
        && $request->data()['start']['dateTime'] === '2026-10-15T16:00:00');

    resolve(UpdateVisit::class)->handle($visit, VisitUpdateData::from(['status' => VisitStatus::Cancelled->value]));

    expect($visit->refresh()->calendar_event_id)->toBeNull();
    Http::assertSent(fn ($request): bool => $request->method() === 'DELETE' && str_contains($request->url(), '/events/evt_visit_1'));
});

it('moves the event to the agenda of the new member when the visit changes hands', function (): void {
    fakeGoogle();
    $charles = agendaMember();
    $camille = agendaMember('Camille Roche', 'camille@relocation-in-paris.fr');
    $visit = bookVisit($charles);

    resolve(UpdateVisit::class)->handle($visit, VisitUpdateData::from(['assigned_to' => $camille->id]));

    // Retiré de l'agenda de Charles, créé dans celui de Camille.
    Http::assertSent(fn ($request): bool => $request->method() === 'DELETE' && str_contains($request->url(), '/events/evt_visit_1'));
    expect($visit->refresh()->calendar_email)->toBe('camille@relocation-in-paris.fr');
});

it('forgets the event when the visit is deleted', function (): void {
    fakeGoogle();
    $visit = bookVisit(agendaMember());

    resolve(DeleteVisit::class)->handle($visit);

    Http::assertSent(fn ($request): bool => $request->method() === 'DELETE' && str_contains($request->url(), '/events/evt_visit_1'));
});

it('never blocks a visit when Google is down', function (): void {
    fakeGoogle(500);

    $visit = bookVisit(agendaMember());

    expect($visit->exists)->toBeTrue()
        ->and($visit->refresh()->calendar_event_id)->toBeNull();
});
