<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Ce en quoi une agence (ou un agent) est bonne : ce qu'on lui confie en
 * priorité. Renseigné à la main sur la fiche, ou proposé par l'assistant.
 * Miroir front : resources/js/lib/agency-profile.ts.
 */
enum AgencySpecialty: string
{
    case Furnished = 'furnished';
    case Unfurnished = 'unfurnished';
    case Luxury = 'luxury';
    case Students = 'students';
    case Expats = 'expats';
    case Corporate = 'corporate';
    case Families = 'families';
    case ShortTerm = 'short_term';
    case Flatshare = 'flatshare';

    public function label(): string
    {
        return match ($this) {
            self::Furnished => 'Meublé',
            self::Unfurnished => 'Vide',
            self::Luxury => 'Haut de gamme',
            self::Students => 'Étudiants',
            self::Expats => 'Expatriés',
            self::Corporate => 'Mobilité d’entreprise',
            self::Families => 'Familles, grandes surfaces',
            self::ShortTerm => 'Courte durée',
            self::Flatshare => 'Colocation',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
