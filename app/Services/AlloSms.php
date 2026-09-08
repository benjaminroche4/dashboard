<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\PhoneNumber;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Client minimal Allo (withallo.com) : envoi d'un SMS.
 * `POST {base_url}/v1/api/sms`, en-tête `Authorization: Api-Key …` (clé avec la portée SMS_SEND),
 * corps `{from, to, message}` ; pour la France, un Sender ID vérifié remplace `from` (`sender_id`).
 * Un échec est journalisé, jamais remonté : le temps réel et les alertes ne doivent pas casser une requête.
 */
final readonly class AlloSms
{
    private string $baseUrl;

    public function __construct(
        private ?string $apiKey,
        private ?string $from,
        private ?string $senderId,
        string $baseUrl,
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public static function fromConfig(): self
    {
        return new self(
            apiKey: config('services.allo.api_key'),
            from: config('services.allo.from'),
            senderId: config('services.allo.sender_id'),
            baseUrl: (string) config('services.allo.base_url', 'https://api.withallo.com'),
        );
    }

    /** Vrai avec une clé API et un expéditeur (numéro Allo ou Sender ID). */
    public function configured(): bool
    {
        return $this->apiKey !== null && $this->apiKey !== '' && $this->sender() !== null;
    }

    /**
     * Envoie un SMS au numéro donné (saisie libre, normalisée en E.164).
     * Sans configuration ou avec un numéro invalide, rien n'est envoyé.
     */
    public function send(string $to, string $text): void
    {
        if (! $this->configured()) {
            return;
        }

        $recipient = PhoneNumber::e164($to);

        if ($recipient === null) {
            Log::warning('SMS Allo non envoyé : numéro de destinataire invalide.', ['to' => $to]);

            return;
        }

        try {
            Http::withHeaders(['Authorization' => 'Api-Key '.$this->apiKey])
                ->acceptJson()
                ->timeout(15)
                ->post($this->baseUrl.'/v1/api/sms', [...$this->sender() ?? [], 'to' => $recipient, 'message' => $text])
                ->throw();
        } catch (RequestException $exception) {
            Log::error('SMS Allo refusé : '.$exception->response->status(), ['to' => $recipient, 'body' => $exception->response->body()]);
        } catch (Throwable $exception) {
            Log::error('SMS Allo injoignable : '.$exception->getMessage(), ['to' => $recipient]);
        }
    }

    /**
     * Champ expéditeur du corps : Sender ID vérifié s'il est configuré, sinon le numéro Allo en E.164.
     *
     * @return array<string, string>|null
     */
    private function sender(): ?array
    {
        if ($this->senderId !== null && $this->senderId !== '') {
            return ['sender_id' => $this->senderId];
        }

        $from = PhoneNumber::e164($this->from);

        return $from === null ? null : ['from' => $from];
    }
}
