<?php

declare(strict_types=1);

use App\Actions\Leads\ScheduleLeadVisio;
use App\Enums\LeadLanguage;
use App\Enums\RecontactChannel;
use App\Events\DashboardUpdated;
use App\Mail\LeadVisioScheduled;
use App\Models\Lead;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
    config()->set('company.mail.sender_domains', ['relocation-in-paris.fr']);
    config()->set('mail.from', ['address' => 'contact@relocation-in-paris.fr', 'name' => 'Relocation in Paris']);
});

function fakeCalendar(): void
{
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $pem);
    config()->set('services.google.calendar_key_file', base64_encode((string) json_encode(['client_email' => 'bot@project.iam.gserviceaccount.com', 'private_key' => $pem])));
    config()->set('services.google.calendar_organizer', 'contact@relocation-in-paris.fr');
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'ya29.test']),
        'www.googleapis.com/calendar/v3/calendars/primary/events*' => Http::response(['id' => 'evt_1', 'hangoutLink' => 'https://meet.google.com/abc-defg-hij']),
    ]);
}

test('it creates the Meet event in the advisor agenda and e-mails the invitation in the lead language', function (): void {
    fakeCalendar();
    $charles = User::factory()->create(['name' => 'Charles Martin', 'email' => 'charles@relocation-in-paris.fr']);
    $lead = Lead::factory()->create(['first_name' => 'Emma', 'last_name' => 'Stone', 'email' => 'emma@example.com', 'language' => LeadLanguage::English, 'assigned_to' => $charles->id]);
    $at = CarbonImmutable::parse('2026-10-14 14:30', 'Europe/Paris');

    resolve(ScheduleLeadVisio::class)->handle($lead, $at, $charles);

    $lead->refresh();
    expect($lead->visio_at?->format('Y-m-d H:i'))->toBe('2026-10-14 14:30')
        ->and($lead->visio_event_id)->toBe('evt_1')
        ->and($lead->visio_meet_link)->toBe('https://meet.google.com/abc-defg-hij')
        ->and($lead->recontact_channel)->toBe(RecontactChannel::Visio)
        ->and($lead->recontact_at?->toDateString())->toBe('2026-10-14')
        ->and($lead->notes()->first()?->body)->toContain('Visio programmée le')->toContain('meet.google.com');

    // Jeton demandé au nom de Charles (délégation), événement avec Meet et les deux participants.
    Http::assertSent(fn ($request): bool => str_contains($request->url(), 'oauth2.googleapis.com') && str_contains((string) $request['assertion'], '.'));
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/events?conferenceDataVersion=1&sendUpdates=all')
        && $request['summary'] === 'Emma • Charles - Your new Home in Paris'
        && $request['start']['timeZone'] === 'Europe/Paris'
        && $request['start']['dateTime'] === '2026-10-14T14:30:00'
        && collect($request['attendees'])->pluck('email')->all() === ['emma@example.com', 'charles@relocation-in-paris.fr']
        && $request['conferenceData']['createRequest']['conferenceSolutionKey']['type'] === 'hangoutsMeet');

    Mail::assertSent(LeadVisioScheduled::class, function (LeadVisioScheduled $mail): bool {
        $rendered = $mail->locale('en')->render();

        return $mail->hasTo('emma@example.com')
            && $mail->locale === 'en'
            && $mail->hasReplyTo('charles@relocation-in-paris.fr', 'Charles Martin')
            && ($mail->from[0]['address'] ?? null) === 'charles@relocation-in-paris.fr'
            && $mail->meetLink === 'https://meet.google.com/abc-defg-hij'
            && str_contains($rendered, 'Your video call is confirmed')
            && str_contains($rendered, 'Wednesday 14 October')
            && str_contains($rendered, '14:30')
            && str_contains($rendered, 'With <strong style="color:#111827">Charles</strong>')
            && str_contains($rendered, 'calendar.google.com/calendar/render')
            && ! str_contains(strtolower($rendered), 'visio');
    });
    app()->setLocale('en');
    expect((new LeadVisioScheduled($lead, $at, null, false, ''))->envelope()->subject)->toBe('Your video call is confirmed: Wednesday 14 October at 14:30');
    app()->setLocale('fr');
    expect((new LeadVisioScheduled($lead, $at, null, true, ''))->envelope()->subject)->toBe('Votre appel vidéo est déplacé au mercredi 14 octobre à 14h30');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a programmé une visio avec Emma Stone'));
});

test('without Google Calendar the ICS invitation still goes out, from the central address', function (): void {
    config()->set('services.google.calendar_key_file');
    Http::fake();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'email' => 'lea@example.com', 'language' => LeadLanguage::French, 'assigned_to' => null]);

    resolve(ScheduleLeadVisio::class)->handle($lead, CarbonImmutable::parse('2026-10-14 10:00', 'Europe/Paris'));

    Http::assertNothingSent();
    expect($lead->refresh()->visio_event_id)->toBeNull()->and($lead->visio_meet_link)->toBeNull();
    Mail::assertSent(LeadVisioScheduled::class, function (LeadVisioScheduled $mail): bool {
        $attachment = $mail->attachments()[0] ?? null;
        $rendered = $mail->locale('fr')->render();

        return $attachment !== null
            && $mail->from === []
            && str_contains($rendered, 'Votre appel vidéo est confirmé')
            && str_contains($rendered, 'notre équipe')
            && str_contains($rendered, '10h00');
    });
});

test('rescheduling patches the same event and says so', function (): void {
    fakeCalendar();
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'visio_at' => '2026-10-14 10:00', 'visio_event_id' => 'evt_1', 'visio_meet_link' => 'https://meet.google.com/abc-defg-hij']);

    resolve(ScheduleLeadVisio::class)->handle($lead, CarbonImmutable::parse('2026-10-15 11:00', 'Europe/Paris'));

    Http::assertSent(fn ($request): bool => $request->method() === 'PATCH' && str_contains($request->url(), '/events/evt_1'));
    Mail::assertSent(LeadVisioScheduled::class, fn (LeadVisioScheduled $mail): bool => $mail->rescheduled);
    expect($lead->refresh()->notes()->first()?->body)->toStartWith('Visio déplacée au');
});

test('it refuses a lead without e-mail', function (): void {
    $lead = Lead::factory()->create(['email' => null, 'phone' => '+33 6 00 00 00 00']);

    expect(fn () => resolve(ScheduleLeadVisio::class)->handle($lead, CarbonImmutable::parse('2026-10-14 10:00')))
        ->toThrow(ValidationException::class, 'e-mail');
    Mail::assertNothingSent();
});
