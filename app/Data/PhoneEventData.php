<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\PhoneCallResult;
use App\Enums\PhoneEventKind;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Appel terminé ou SMS reçu, tel que livré par le webhook Allo.
 */
final readonly class PhoneEventData
{
    public function __construct(
        public PhoneEventKind $kind,
        public string $externalId,
        public bool $inbound,
        public string $fromNumber,
        public string $toNumber,
        public ?string $contactName,
        public ?PhoneCallResult $result,
        public ?float $lengthInMinutes,
        public ?string $summary,
        public ?string $content,
        public ?string $userEmail,
        public ?CarbonInterface $at,
    ) {}

    /**
     * @param  array<string, mixed>  $data  Contenu de `data` du webhook
     */
    public static function from(string $topic, array $data): self
    {
        $kind = PhoneEventKind::from($topic);
        // Appel : `type` vaut INBOUND/OUTBOUND ; SMS : `type` vaut SMS/MMS et la direction est dans `direction`.
        $direction = $kind === PhoneEventKind::SmsReceived ? ($data['direction'] ?? 'INBOUND') : ($data['type'] ?? 'INBOUND');
        $inbound = $direction === 'INBOUND';
        $fromNumber = (string) ($data['from_number'] ?? '');
        $toNumber = (string) ($data['to_number'] ?? $data['to'] ?? '');

        return new self(
            kind: $kind,
            externalId: (string) ($data['id'] ?? ''),
            inbound: $inbound,
            fromNumber: $fromNumber,
            toNumber: $toNumber,
            contactName: self::blankToNull($inbound ? ($data['from_name'] ?? null) : ($data['to_name'] ?? null)),
            result: $kind === PhoneEventKind::CallCompleted ? PhoneCallResult::tryFrom((string) ($data['result'] ?? '')) : null,
            lengthInMinutes: isset($data['length_in_minutes']) ? (float) $data['length_in_minutes'] : null,
            summary: self::blankToNull($data['summary'] ?? null),
            content: self::blankToNull($data['content'] ?? null),
            userEmail: self::blankToNull($data['user_email'] ?? null),
            at: self::date($data['start_date'] ?? $data['sent_at'] ?? null),
        );
    }

    /** Numéro du contact (l'autre bout de la ligne, jamais le numéro Allo). */
    public function contactNumber(): string
    {
        return $this->inbound ? $this->fromNumber : $this->toNumber;
    }

    /** Un appel bloqué ou échoué, ou un événement sans numéro, n'est pas un contact. */
    public function isContact(): bool
    {
        return $this->contactNumber() !== '' && ($this->result?->isContact() ?? true);
    }

    /**
     * L'échange date `last_contacted_at` : SMS reçu, appel sortant, ou appel
     * entrant réellement pris (pas un message vocal).
     */
    public function touchesContact(): bool
    {
        return ! $this->result instanceof PhoneCallResult || ! $this->inbound || $this->result->isConversation();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind,
            'external_id' => $this->externalId,
            'inbound' => $this->inbound,
            'from_number' => $this->fromNumber,
            'to_number' => $this->toNumber,
            'contact_name' => $this->contactName,
            'result' => $this->result,
            'length_in_minutes' => $this->lengthInMinutes,
            'summary' => $this->summary,
            'content' => $this->content,
            'user_email' => $this->userEmail,
            'at' => $this->at,
        ];
    }

    private static function date(mixed $value): ?CarbonInterface
    {
        return is_string($value) && $value !== '' ? Date::parse($value) : null;
    }

    private static function blankToNull(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
