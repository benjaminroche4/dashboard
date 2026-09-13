<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Deux natures de notes sur un lead ou un dossier, qui ne se lisent pas de la
 * même façon : le **suivi** que l'application écrit toute seule au fil des
 * actions (visite planifiée, facture rattachée, bien attribué), et les
 * **notes de l'équipe**, écrites par un membre pour ses collègues.
 */
enum LeadNoteKind: string
{
    /** Écrite par l'application au fil des actions. */
    case Tracking = 'tracking';

    /** Écrite par un membre de l'équipe, pour l'équipe. */
    case Team = 'team';

    public function label(): string
    {
        return match ($this) {
            self::Tracking => 'Suivi',
            self::Team => 'Note de l’équipe',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $kind): array => ['value' => $kind->value, 'label' => $kind->label()],
            self::cases(),
        );
    }
}
