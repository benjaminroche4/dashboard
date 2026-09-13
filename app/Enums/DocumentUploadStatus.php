<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Vérification d'une pièce déposée par le client : l'équipe la valide ou la
 * refuse (avec, si elle le souhaite, un motif que le client lit sur sa page
 * de dépôt).
 */
enum DocumentUploadStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Refused = 'refused';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'À vérifier',
            self::Accepted => 'Validée',
            self::Refused => 'Refusée',
        };
    }

    /** Libellé lu par le client, dans sa langue. */
    public function clientLabel(): string
    {
        return match ($this) {
            self::Pending => __('En cours de vérification'),
            self::Accepted => __('Validée'),
            self::Refused => __('Refusée'),
        };
    }

    /** Décision que l'équipe peut poser : « À vérifier » est l'état de départ. */
    public function isDecision(): bool
    {
        return $this !== self::Pending;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
