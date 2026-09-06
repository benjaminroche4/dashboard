<?php

declare(strict_types=1);

use App\Support\IcsInvite;
use Carbon\CarbonImmutable;

test('it builds a valid iCalendar request with organizer, attendees and folded lines', function (): void {
    $start = CarbonImmutable::parse('2026-10-14 14:30', 'Europe/Paris');
    $ics = IcsInvite::build(
        uid: 'evt_1@google.com',
        summary: 'Emma • Charles - Votre nouvel appartement à Paris',
        description: "Appel vidéo avec Charles, Relocation in Paris.\nRejoindre : https://meet.google.com/abc",
        start: $start,
        end: $start->addMinutes(20),
        organizerEmail: 'charles@relocation-in-paris.fr',
        organizerName: 'Charles Martin',
        attendees: [['email' => 'emma@example.com', 'name' => 'Emma Stone'], ['email' => 'charles@relocation-in-paris.fr']],
        url: 'https://meet.google.com/abc',
    );

    // Les lignes longues sont repliées (RFC 5545) : on lit le contenu déplié.
    $unfolded = str_replace("\r\n ", '', $ics);

    expect($unfolded)->toStartWith("BEGIN:VCALENDAR\r\n")
        ->toContain("METHOD:REQUEST\r\n")
        ->toContain("UID:evt_1@google.com\r\n")
        ->toContain("DTSTART:20261014T123000Z\r\n")
        ->toContain("DTEND:20261014T125000Z\r\n")
        ->toContain('ORGANIZER;CN="Charles Martin":mailto:charles@relocation-in-paris.fr')
        ->toContain('ATTENDEE;CN="Emma Stone";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:emma@example.com')
        ->toContain('DESCRIPTION:Appel vidéo avec Charles\, Relocation in Paris.\nRejoindre : ')
        ->toContain("URL:https://meet.google.com/abc\r\n")
        ->toEndWith("END:VCALENDAR\r\n");

    foreach (explode("\r\n", $ics) as $line) {
        expect(strlen($line))->toBeLessThanOrEqual(75);
    }

    expect(IcsInvite::build('u', 's', 'd', $start, $start->addMinutes(20), 'a@b.fr', 'A', [], cancelled: true))
        ->toContain("METHOD:CANCEL\r\n")->toContain("STATUS:CANCELLED\r\n");
});
