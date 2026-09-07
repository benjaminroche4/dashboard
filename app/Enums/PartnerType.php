<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Nature d'un partenaire de l'équipe.
 */
enum PartnerType: string
{
    case Management = 'management';
    case Insurance = 'insurance';
    case Bank = 'bank';
    case Mover = 'mover';
    case Partnership = 'partnership';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Management => 'Gestion',
            self::Insurance => 'Assurance',
            self::Bank => 'Banque',
            self::Mover => 'Déménagement',
            self::Partnership => 'Partenariat',
            self::Other => 'Autre',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $type): array => ['value' => $type->value, 'label' => $type->label()], self::cases());
    }
}
