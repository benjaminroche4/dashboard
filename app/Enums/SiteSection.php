<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Sections et sous-sections du site qu'un administrateur peut ouvrir ou
 * fermer à un membre depuis Paramètres › Équipe. Le tableau de bord et les
 * paramètres restent toujours accessibles.
 */
enum SiteSection: string
{
    case Leads = 'leads';
    case LeadsCreate = 'leads_create';
    case OwnerLeads = 'owner_leads';
    case OwnerLeadsCreate = 'owner_leads_create';
    case Clients = 'clients';
    case Visits = 'visits';
    case Agents = 'agents';
    case Agencies = 'agencies';
    case Partners = 'partners';
    case Owners = 'owners';
    case Properties = 'properties';
    case Quotes = 'quotes';
    case Invoices = 'invoices';
    case Documents = 'documents';
    case Reports = 'reports';

    public function label(): string
    {
        return match ($this) {
            self::Leads => 'Leads locataires',
            self::LeadsCreate => 'Converting Machine (locataires)',
            self::OwnerLeads => 'Leads propriétaires',
            self::OwnerLeadsCreate => 'Converting Machine (propriétaires)',
            self::Clients => 'Dossiers clients',
            self::Visits => 'Visites',
            self::Agents => 'Agents immobiliers',
            self::Agencies => 'Agences',
            self::Partners => 'Partenaires',
            self::Owners => 'Propriétaires',
            self::Properties => 'Biens',
            self::Quotes => 'Devis',
            self::Invoices => 'Factures',
            self::Documents => 'Listes de documents',
            self::Reports => 'Rapports',
        };
    }

    /**
     * Niveau d'accès donné par le rôle quand rien n'est personnalisé : un admin
     * gère tout, un manager modifie tout, un membre modifie tout sauf devis et
     * factures qu'il consulte seulement (règles historiques des Policies).
     */
    public function defaultLevel(StaffRole $role): AccessLevel
    {
        return match ($role) {
            StaffRole::Admin => AccessLevel::Manage,
            StaffRole::Manager => AccessLevel::Write,
            StaffRole::Member => in_array($this, [self::Quotes, self::Invoices], true) ? AccessLevel::Read : AccessLevel::Write,
        };
    }

    /** Ce que « Gérer » ajoute dans cette section, pour la page des droits. */
    public function manageHint(): string
    {
        return match ($this) {
            self::Leads, self::OwnerLeads => 'supprimer un lead',
            self::LeadsCreate, self::OwnerLeadsCreate => 'aucune action supplémentaire',
            self::Clients => 'aucune action supplémentaire',
            self::Visits => 'supprimer une visite',
            self::Agents, self::Agencies => 'supprimer un agent ou une agence',
            self::Partners => 'supprimer un partenaire',
            self::Owners => 'supprimer un propriétaire',
            self::Properties => 'supprimer un bien',
            self::Quotes => 'supprimer un devis',
            self::Invoices => 'supprimer une facture',
            self::Documents => 'supprimer une liste et modifier le catalogue des pièces',
            self::Reports => 'aucune action supplémentaire',
        };
    }

    /** Groupe du menu, tel qu'il apparaît dans la sidebar. */
    public function group(): string
    {
        return match ($this) {
            self::Leads, self::LeadsCreate, self::OwnerLeads, self::OwnerLeadsCreate => 'Leads',
            self::Clients, self::Visits => 'Clients',
            self::Agents, self::Agencies, self::Partners, self::Owners, self::Properties => 'Réseau',
            self::Quotes, self::Invoices, self::Documents, self::Reports => 'Outils',
        };
    }

    /**
     * Sections qui donnent accès à une route, d'après son nom ; vide = route libre.
     * Une fiche lead est partagée par les deux listes de leads : l'une ou l'autre suffit.
     *
     * @return list<self>
     */
    public static function forRoute(?string $route): array
    {
        if ($route === null) {
            return [];
        }

        return match (true) {
            $route === 'leads.create', $route === 'leads.store' => [self::LeadsCreate, self::OwnerLeadsCreate],
            $route === 'leads.index' => [self::Leads],
            str_starts_with($route, 'leads.') => [self::Leads, self::OwnerLeads],
            $route === 'owners.leads.create', $route === 'owners.leads.store' => [self::OwnerLeadsCreate],
            str_starts_with($route, 'owners.leads') => [self::OwnerLeads],
            str_starts_with($route, 'owners.') => [self::Owners],
            str_starts_with($route, 'clients.visits') => [self::Visits],
            str_starts_with($route, 'clients.') => [self::Clients],
            str_starts_with($route, 'agents.') => [self::Agents],
            str_starts_with($route, 'agencies.') => [self::Agencies],
            str_starts_with($route, 'partners.') => [self::Partners],
            str_starts_with($route, 'properties.') => [self::Properties],
            str_starts_with($route, 'tools.quotes.') => [self::Quotes],
            str_starts_with($route, 'invoices.') => [self::Invoices],
            str_starts_with($route, 'tools.documents.') => [self::Documents],
            str_starts_with($route, 'tools.reports.') => [self::Reports],
            str_starts_with($route, 'tools.activity.') => [self::Reports],
            $route === 'tools.index' => [self::Quotes, self::Invoices, self::Documents, self::Reports],
            default => [],
        };
    }

    /**
     * @return list<array{value: string, label: string, group: string, manage_hint: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label(), 'group' => $case->group(), 'manage_hint' => $case->manageHint()],
            self::cases(),
        );
    }

    /**
     * Niveaux par défaut de chaque rôle, section par section.
     *
     * @return array<string, array<string, string>>
     */
    public static function roleDefaults(): array
    {
        $defaults = [];
        foreach (StaffRole::cases() as $role) {
            foreach (self::cases() as $section) {
                $defaults[$role->value][$section->value] = $section->defaultLevel($role)->value;
            }
        }

        return $defaults;
    }
}
