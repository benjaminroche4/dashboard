<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Type de demande du formulaire de contact du site Relocation In Paris
 * (clés `contact.contactForm.helpType.choice.1` à `.4` côté site).
 */
enum WebsiteHelpType: string
{
    case HousingSearch = 'housing_search';
    case Business = 'business';
    case RentalManagement = 'rental_management';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::HousingSearch => 'Recherche de logement',
            self::Business => 'Solutions pour entreprises',
            self::RentalManagement => 'Gestion locative',
            self::Other => 'Autre demande ou information',
        };
    }
}
