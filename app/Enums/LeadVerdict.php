<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * L'avis de l'assistant IA sur un lead à son arrivée : qualifié, non
 * qualifié, ou neutre quand il manque d'éléments.
 * Conservé sur le lead (`leads.ai_verdict`) même après relecture des
 * propositions, pour qu'on le retrouve d'un coup d'œil.
 */
enum LeadVerdict: string
{
    case Qualified = 'qualified';
    case NotQualified = 'not_qualified';
    /** L'assistant n'a pas assez d'éléments pour trancher. */
    case Neutral = 'neutral';

    public function label(): string
    {
        return match ($this) {
            self::Qualified => 'Qualifié',
            self::NotQualified => 'Non qualifié',
            self::Neutral => 'À vérifier',
        };
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
