<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Ce que fait un partenaire sur le dossier d'un lead.
 */
enum PartnerRole: string
{
    case Guarantee = 'guarantee';
    case HomeInsurance = 'home_insurance';
    case Moving = 'moving';
    case BankAccount = 'bank_account';
    case Management = 'management';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Guarantee => 'Garantie',
            self::HomeInsurance => 'Assurance habitation',
            self::Moving => 'Déménagement',
            self::BankAccount => 'Compte bancaire',
            self::Management => 'Gestion locative',
            self::Other => 'Autre',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $role): array => ['value' => $role->value, 'label' => $role->label()], self::cases());
    }
}
