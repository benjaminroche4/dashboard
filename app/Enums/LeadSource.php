<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Par quel canal le lead est arrivé.
 */
enum LeadSource: string
{
    case Website = 'website';
    case Phone = 'phone';
    case Referral = 'referral';
    case SocialMedia = 'social_media';
    case Partner = 'partner';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Website => 'Site web',
            self::Phone => 'Téléphone',
            self::Referral => 'Recommandation',
            self::SocialMedia => 'Réseaux sociaux',
            self::Partner => 'Partenaire',
            self::Other => 'Autre',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
