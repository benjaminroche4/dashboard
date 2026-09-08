<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Type de bail envisagé par un propriétaire.
 */
enum LeaseType: string
{
    case Alur = 'alur';
    case CivilCode = 'civil_code';
    case Mobility = 'mobility';
    case Airbnb = 'airbnb';
    case NoIdea = 'no_idea';

    public function label(): string
    {
        return match ($this) {
            self::Alur => 'Loi Alur',
            self::CivilCode => 'Code civil',
            self::Mobility => 'Bail mobilité',
            self::Airbnb => 'Airbnb',
            self::NoIdea => 'Aucune idée',
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
