<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * Invitation iCalendar (METHOD:REQUEST) jointe aux e-mails de visio : les
 * clients mail hors Google (Outlook, Apple Mail) l'ajoutent à l'agenda en un
 * clic. L'UID reprend celui de l'événement Google quand il existe, pour que
 * les agendas fusionnent au lieu de dupliquer.
 */
final class IcsInvite
{
    /**
     * @param  list<array{email: string, name?: string}>  $attendees
     */
    public static function build(
        string $uid,
        string $summary,
        string $description,
        CarbonInterface $start,
        CarbonInterface $end,
        string $organizerEmail,
        string $organizerName,
        array $attendees,
        ?string $url = null,
        bool $cancelled = false,
    ): string {
        $now = now('UTC');
        $lines = [
            'BEGIN:VCALENDAR',
            'PRODID:-//Relocation in Paris//VideoCall//FR',
            'VERSION:2.0',
            'CALSCALE:GREGORIAN',
            $cancelled ? 'METHOD:CANCEL' : 'METHOD:REQUEST',
            'BEGIN:VEVENT',
            'UID:'.$uid,
            'SEQUENCE:'.$now->getTimestamp(),
            'DTSTAMP:'.$now->format('Ymd\THis\Z'),
            'DTSTART:'.$start->copy()->setTimezone('UTC')->format('Ymd\THis\Z'),
            'DTEND:'.$end->copy()->setTimezone('UTC')->format('Ymd\THis\Z'),
            'SUMMARY:'.self::escape($summary),
            'DESCRIPTION:'.self::escape($description),
            'ORGANIZER;CN='.self::quote($organizerName).':mailto:'.$organizerEmail,
        ];

        if ($url !== null) {
            $lines[] = 'URL:'.$url;
        }

        if ($cancelled) {
            $lines[] = 'STATUS:CANCELLED';
        }

        foreach ($attendees as $attendee) {
            $cn = isset($attendee['name']) ? 'CN='.self::quote($attendee['name']).';' : '';
            $lines[] = "ATTENDEE;{$cn}ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:".$attendee['email'];
        }

        $lines[] = 'END:VEVENT';
        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", array_map(self::fold(...), $lines))."\r\n";
    }

    private static function escape(string $text): string
    {
        return str_replace(['\\', ';', ',', "\r\n", "\r", "\n"], ['\\\\', '\;', '\,', '\n', '\n', '\n'], $text);
    }

    private static function quote(string $text): string
    {
        return '"'.str_replace(['"', ';', ':', ',', "\r", "\n"], '', $text).'"';
    }

    /** Repli RFC 5545 : lignes de 75 octets maximum. */
    private static function fold(string $line): string
    {
        $folded = '';

        while (strlen($line) > 75) {
            $chunk = mb_strcut($line, 0, 75);
            $folded .= $chunk."\r\n ";
            $line = substr($line, strlen($chunk));
        }

        return $folded.$line;
    }
}
