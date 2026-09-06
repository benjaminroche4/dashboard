<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Rôle d'une personne du foyer dans une demande de pièces.
 */
enum HouseholdRole: string
{
    case Tenant = 'tenant';
    case Guarantor = 'guarantor';

    public function label(): string
    {
        return match ($this) {
            self::Tenant => 'Locataire',
            self::Guarantor => 'Garant',
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
