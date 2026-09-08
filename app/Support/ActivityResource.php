<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Libellés français des ressources du journal d'activité (slug porté par
 * DashboardUpdated). Un slug inconnu est affiché tel quel.
 */
final class ActivityResource
{
    /** Slugs dont le payload `id` désigne un lead. */
    public const array LEAD_RESOURCES = ['leads', 'clients'];

    /** @var array<string, string> */
    private const array LABELS = [
        'leads' => 'Leads',
        'clients' => 'Dossiers',
        'invoices' => 'Factures',
        'quotes' => 'Devis',
        'visits' => 'Visites',
        'properties' => 'Biens',
        'agents' => 'Agents immobiliers',
        'agencies' => 'Agents immobiliers',
        'partners' => 'Partenaires',
        'owners' => 'Propriétaires',
        'documents' => 'Documents',
        'catalog' => 'Documents',
        'staff' => 'Équipe',
    ];

    public static function label(string $slug): string
    {
        return self::LABELS[$slug] ?? $slug;
    }

    public static function concernsLead(string $slug): bool
    {
        return in_array($slug, self::LEAD_RESOURCES, true);
    }
}
