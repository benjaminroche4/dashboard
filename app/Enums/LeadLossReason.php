<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Pourquoi un lead est archivé sans conversion : la donnée clé pour lire le pipeline.
 */
enum LeadLossReason: string
{
    case TooExpensive = 'too_expensive';
    case WentElsewhere = 'went_elsewhere';
    case NoAnswer = 'no_answer';
    case OutOfScope = 'out_of_scope';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::TooExpensive => 'Trop cher',
            self::WentElsewhere => 'Parti ailleurs',
            self::NoAnswer => 'Sans réponse',
            self::OutOfScope => 'Hors périmètre',
            self::Other => 'Autre',
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
