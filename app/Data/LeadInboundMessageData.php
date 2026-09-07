<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\LeadSource;
use App\Models\Lead;
use App\Models\LeadNote;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * Ce que le lead nous a dit en arrivant : message du formulaire du site,
 * résumé du premier appel entrant ou texte du premier SMS reçu.
 * Null quand le lead a été saisi à la main par l'équipe.
 */
final readonly class LeadInboundMessageData
{
    /** Séparateur entre l'en-tête d'une note d'appel ou de SMS et son contenu. */
    private const string NOTE_SEPARATOR = ' : ';

    /**
     * @param  'website'|'call'|'sms'  $kind
     * @param  string  $meta  Contexte court affiché au-dessus du message (formulaire, durée d'appel…).
     */
    private function __construct(
        public string $kind,
        public string $body,
        public string $meta,
        public ?CarbonInterface $at,
    ) {}

    public static function fromLead(Lead $lead): ?self
    {
        return match ($lead->source) {
            LeadSource::Website => self::fromWebsite($lead),
            LeadSource::Phone => self::fromPhone($lead),
            default => null,
        };
    }

    /**
     * @param  array{kind: 'website'|'call'|'sms', body: string, meta: string, at: ?string}  $data
     */
    public static function from(array $data): self
    {
        return new self(
            kind: $data['kind'],
            body: $data['body'],
            meta: $data['meta'],
            at: $data['at'] === null ? null : Date::parse($data['at']),
        );
    }

    /**
     * @return array{kind: string, body: string, meta: string, at: ?string}
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind,
            'body' => $this->body,
            'meta' => $this->meta,
            'at' => $this->at?->toIso8601String(),
        ];
    }

    private static function fromWebsite(Lead $lead): ?self
    {
        $body = trim((string) $lead->message);

        if ($body === '') {
            return null;
        }

        return new self('website', $body, $lead->source_note ?? $lead->source->label(), $lead->created_at);
    }

    /**
     * La première note posée par le webhook téléphonie : « Appel entrant (…) : résumé »
     * ou « SMS reçu : texte ».
     */
    private static function fromPhone(Lead $lead): ?self
    {
        /** @var LeadNote|null $note */
        $note = $lead->notes
            ->sortBy(fn (LeadNote $note): int => $note->id)
            ->first(fn (LeadNote $note): bool => self::phoneKind($note->body) !== null);

        $kind = $note === null ? null : self::phoneKind($note->body);

        if ($note === null || $kind === null) {
            return null;
        }

        [$meta, $body] = array_pad(explode(self::NOTE_SEPARATOR, $note->body, 2), 2, '');
        $body = trim($body);

        if ($body === '') {
            return null;
        }

        return new self($kind, $body, trim($meta), $note->created_at);
    }

    /**
     * @return 'call'|'sms'|null
     */
    private static function phoneKind(string $body): ?string
    {
        if (str_starts_with($body, __('SMS reçu'))) {
            return 'sms';
        }

        if (str_starts_with($body, __('Appel entrant'))) {
            return 'call';
        }

        return null;
    }
}
