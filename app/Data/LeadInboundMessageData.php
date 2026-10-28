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
     * @param  string  $meta  Contexte court (formulaire et référence, durée d'appel…) ; la fiche ne l'affiche plus pour un message du site.
     * @param  ?string  $topic  Type de demande du formulaire du site (« Gestion locative »), écrit en tête du message.
     */
    private function __construct(
        public string $kind,
        public string $body,
        public string $meta,
        public ?CarbonInterface $at,
        /** Note d'où vient un résumé d'appel ou de SMS : deux cartes ne montrent jamais la même. */
        public ?int $noteId = null,
        public ?string $topic = null,
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
     * @param  array{kind: 'website'|'call'|'sms', body: string, meta: string, at: ?string, note_id?: int|null, topic?: string|null}  $data
     */
    public static function from(array $data): self
    {
        return new self(
            kind: $data['kind'],
            body: $data['body'],
            meta: $data['meta'],
            at: $data['at'] === null ? null : Date::parse($data['at']),
            noteId: $data['note_id'] ?? null,
            topic: $data['topic'] ?? null,
        );
    }

    /**
     * @return array{kind: string, body: string, meta: string, at: ?string, note_id: int|null, topic: string|null}
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind,
            'body' => $this->body,
            'meta' => $this->meta,
            'at' => $this->at?->toIso8601String(),
            'note_id' => $this->noteId,
            'topic' => $this->topic,
        ];
    }

    /**
     * Dernier échange téléphonique noté sur le lead, **quelle que soit sa
     * source** : un lead venu du site ou saisi à la main reçoit aussi des
     * appels, et leur résumé ne doit pas rester enfoui dans les notes.
     */
    public static function lastPhone(Lead $lead): ?self
    {
        $lead->loadMissing('notes');

        /** @var LeadNote|null $note */
        $note = $lead->notes
            ->sortByDesc(fn (LeadNote $note): int => $note->id)
            ->first(fn (LeadNote $note): bool => self::phoneKind($note->body) !== null);

        return $note === null ? null : self::fromNote($note);
    }

    private static function fromWebsite(Lead $lead): ?self
    {
        $body = trim((string) $lead->message);

        if ($body === '') {
            return null;
        }

        return new self(
            'website',
            $body,
            $lead->source_note ?? $lead->source->label(),
            $lead->created_at,
            topic: self::websiteTopic($lead),
        );
    }

    /**
     * Sujet de la demande du site : le type de demande du lead, à défaut le
     * deuxième segment de la note de source (« Formulaire de contact · Gestion
     * locative · CT-… ») pour les leads importés avant que `help_type` existe.
     */
    private static function websiteTopic(Lead $lead): ?string
    {
        if ($lead->help_type !== null) {
            return $lead->help_type->label();
        }

        $segments = array_map(trim(...), explode('·', (string) $lead->source_note));

        return count($segments) >= 3 && $segments[1] !== '' ? $segments[1] : null;
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

        return $note === null ? null : self::fromNote($note);
    }

    /** Vrai pour une note posée par la téléphonie (appel ou SMS) : elle rapporte les mots du client. */
    public static function isPhoneNote(LeadNote $note): bool
    {
        return self::phoneKind($note->body) !== null;
    }

    /** Une note « Appel entrant (…) : résumé » ou « SMS reçu : texte » découpée pour l'affichage. */
    private static function fromNote(LeadNote $note): ?self
    {
        $kind = self::phoneKind($note->body);

        if ($kind === null) {
            return null;
        }

        [$meta, $body] = array_pad(explode(self::NOTE_SEPARATOR, $note->body, 2), 2, '');
        $body = trim($body);

        if ($body === '') {
            return null;
        }

        return new self($kind, $body, trim($meta), $note->created_at, $note->id);
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
