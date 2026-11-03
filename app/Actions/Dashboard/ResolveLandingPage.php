<?php

declare(strict_types=1);

namespace App\Actions\Dashboard;

use App\Enums\SiteSection;
use App\Models\User;

/**
 * Page d'arrivée d'un membre : la première liste du menu qui lui est ouverte.
 * La page « Aujourd'hui » a été retirée le 2 novembre 2026 ; `/dashboard`
 * reste l'adresse d'arrivée après connexion et mène ici.
 */
final class ResolveLandingPage
{
    /** @var array<string, SiteSection> Route → section, dans l'ordre du menu. */
    private const array PAGES = [
        'leads.index' => SiteSection::Leads,
        'owners.leads' => SiteSection::OwnerLeads,
        'clients.index' => SiteSection::Clients,
        'clients.visits' => SiteSection::Visits,
        'tools.documents.index' => SiteSection::Documents,
        'agents.index' => SiteSection::Agents,
        'partners.index' => SiteSection::Partners,
        'companies.index' => SiteSection::Companies,
        'owners.index' => SiteSection::Owners,
        'properties.index' => SiteSection::Properties,
        'tools.quotes.index' => SiteSection::Quotes,
        'invoices.index' => SiteSection::Invoices,
    ];

    /** Nom de la route où envoyer le membre ; à défaut, son profil (route libre). */
    public function handle(User $user): string
    {
        foreach (self::PAGES as $route => $section) {
            if ($user->canRead($section)) {
                return $route;
            }
        }

        return 'profile.edit';
    }
}
