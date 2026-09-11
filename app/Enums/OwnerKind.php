<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Nature d'un propriétaire : un particulier, ou une société (SCI, agence,
 * foncière…) qui détient le bien.
 */
enum OwnerKind: string
{
    case Individual = 'individual';
    case Company = 'company';

    public function label(): string
    {
        return match ($this) {
            self::Individual => 'Particulier',
            self::Company => 'Société ou agence',
        };
    }

    public function hint(): string
    {
        return match ($this) {
            self::Individual => 'Une personne physique, propriétaire en son nom.',
            self::Company => 'Une SCI, une agence ou une foncière ; l’interlocuteur reste facultatif.',
        };
    }

    /**
     * @return list<array{value: string, label: string, hint: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => [
            'value' => $case->value,
            'label' => $case->label(),
            'hint' => $case->hint(),
        ], self::cases());
    }
}
