<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Client minimal Google Calendar v3 (même mécanisme que le site RIP) : compte
 * de service Workspace avec délégation, qui agit au nom de l'organisateur
 * (le conseiller ou l'adresse centrale). L'événement est créé dans l'agenda
 * de l'organisateur avec un lien Google Meet, et mis à jour en place quand
 * la visio est déplacée. Non configuré ou en échec : null, l'appelant se
 * rabat sur l'invitation ICS.
 */
final class GoogleCalendar
{
    private const string TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const string EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    private const string SCOPE = 'https://www.googleapis.com/auth/calendar.events';

    /** @var array<string, string> jetons par organisateur */
    private array $tokens = [];

    public function __construct(
        private readonly ?string $keyFile,
        private readonly ?string $organizer,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            keyFile: config('services.google.calendar_key_file') ?: null,
            organizer: config('services.google.calendar_organizer') ?: null,
        );
    }

    public function isConfigured(): bool
    {
        return $this->keyFile !== null && $this->keyFile !== '' && $this->organizer !== null && $this->organizer !== '';
    }

    /** Adresse centrale qui organise les visios sans conseiller sur le domaine. */
    public function organizer(): ?string
    {
        return $this->organizer;
    }

    /**
     * Crée ou déplace la visio et retourne son identifiant et le lien Meet.
     *
     * @param  list<string>  $attendees
     * @return array{eventId: string, meetLink: string|null}|null
     */
    public function upsertVisio(?string $eventId, string $summary, string $description, CarbonInterface $start, CarbonInterface $end, array $attendees, ?string $impersonate = null): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $payload = [
            'summary' => $summary,
            'description' => $description,
            'start' => ['dateTime' => $start->copy()->setTimezone('Europe/Paris')->format('Y-m-d\TH:i:s'), 'timeZone' => 'Europe/Paris'],
            'end' => ['dateTime' => $end->copy()->setTimezone('Europe/Paris')->format('Y-m-d\TH:i:s'), 'timeZone' => 'Europe/Paris'],
            'attendees' => array_map(fn (string $email): array => ['email' => $email], $attendees),
        ];

        try {
            if ($eventId !== null) {
                $event = $this->request('PATCH', self::EVENTS_URL.'/'.rawurlencode($eventId), $payload, $impersonate);

                if ($event !== null) {
                    return $this->result($event);
                }
            }

            $payload['conferenceData'] = ['createRequest' => ['requestId' => (string) Str::uuid(), 'conferenceSolutionKey' => ['type' => 'hangoutsMeet']]];
            $event = $this->request('POST', self::EVENTS_URL, $payload, $impersonate);

            return $event === null ? null : $this->result($event);
        } catch (\Throwable $e) {
            Log::error('Google Calendar : échec de la visio', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /** Supprime l'événement ; vrai s'il n'existe plus (supprimé ou déjà absent). */
    public function delete(string $eventId, ?string $impersonate = null): bool
    {
        if (! $this->isConfigured()) {
            return true;
        }

        try {
            $token = $this->token($impersonate);
            $status = $this->client($token)->delete(self::EVENTS_URL.'/'.rawurlencode($eventId), ['sendUpdates' => 'all'])->status();

            return $status < 400 || in_array($status, [404, 410], true);
        } catch (\Throwable $e) {
            Log::error('Google Calendar : échec de la suppression', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null null uniquement si l'événement n'existe plus (404/410)
     */
    private function request(string $method, string $url, array $payload, ?string $impersonate): ?array
    {
        $response = $this->client($this->token($impersonate))
            ->withQueryParameters(['conferenceDataVersion' => 1, 'sendUpdates' => 'all'])
            ->send($method, $url, ['json' => $payload]);

        if (in_array($response->status(), [404, 410], true)) {
            return null;
        }

        if ($response->failed()) {
            throw new RuntimeException("Google Calendar {$method} a répondu ".$response->status().'.');
        }

        /** @var array<string, mixed> $data */
        $data = $response->json();

        return $data;
    }

    private function client(string $token): PendingRequest
    {
        return Http::withToken($token)->acceptJson()->timeout(10);
    }

    /**
     * Jeton d'accès par assertion JWT du compte de service, au nom de l'organisateur.
     */
    private function token(?string $impersonate): string
    {
        $subject = $impersonate ?? (string) $this->organizer;

        if (isset($this->tokens[$subject])) {
            return $this->tokens[$subject];
        }

        $key = $this->key();
        $now = time();
        $segments = [
            $this->base64Url((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
            $this->base64Url((string) json_encode(['iss' => $key['client_email'], 'sub' => $subject, 'scope' => self::SCOPE, 'aud' => self::TOKEN_URL, 'iat' => $now, 'exp' => $now + 3600])),
        ];
        $signature = '';

        throw_unless(openssl_sign(implode('.', $segments), $signature, $key['private_key'], OPENSSL_ALGO_SHA256), RuntimeException::class, 'Google Calendar : signature JWT impossible.');

        $segments[] = $this->base64Url($signature);
        $response = Http::asForm()->timeout(10)->post(self::TOKEN_URL, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => implode('.', $segments),
        ]);
        $token = $response->json('access_token');

        if (! $response->successful() || ! is_string($token) || $token === '') {
            throw new RuntimeException('Google Calendar : jeton refusé ('.$response->status().').');
        }

        return $this->tokens[$subject] = $token;
    }

    /**
     * La clé est soit un chemin de fichier JSON, soit le JSON encodé en base64.
     *
     * @return array{client_email: string, private_key: string}
     */
    private function key(): array
    {
        $raw = (string) base64_decode((string) $this->keyFile, true);

        if (! json_validate($raw)) {
            $raw = (string) @file_get_contents((string) $this->keyFile);
        }

        /** @var array{client_email?: string, private_key?: string} $key */
        $key = json_decode($raw, true) ?: [];

        throw_unless(isset($key['client_email'], $key['private_key']), RuntimeException::class, 'Google Calendar : clé de compte de service illisible.');

        return ['client_email' => $key['client_email'], 'private_key' => $key['private_key']];
    }

    /**
     * @param  array<string, mixed>  $event
     * @return array{eventId: string, meetLink: string|null}
     */
    private function result(array $event): array
    {
        $meet = $event['hangoutLink'] ?? null;

        foreach ((array) ($event['conferenceData']['entryPoints'] ?? []) as $entry) {
            if (is_array($entry) && ($entry['entryPointType'] ?? null) === 'video' && is_string($entry['uri'] ?? null)) {
                $meet = $entry['uri'];
            }
        }

        return ['eventId' => (string) $event['id'], 'meetLink' => is_string($meet) ? $meet : null];
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
