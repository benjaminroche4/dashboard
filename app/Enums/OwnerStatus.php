<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Avancement de la prospection d'un propriétaire.
 */
enum OwnerStatus: string
{
    case ToContact = 'to_contact';
    case Contacted = 'contacted';
    case Interested = 'interested';
    case Mandate = 'mandate';
    case Declined = 'declined';

    public function label(): string
    {
        return match ($this) {
            self::ToContact => 'À contacter',
            self::Contacted => 'Contacté',
            self::Interested => 'Intéressé',
            self::Mandate => 'Mandat signé',
            self::Declined => 'Pas intéressé',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $status): array => ['value' => $status->value, 'label' => $status->label()], self::cases());
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
