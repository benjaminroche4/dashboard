import type {
    AccessLevelOption,
    AccessMap,
    SiteSection,
    SiteSectionOption,
    StaffFunctionOption,
    StaffRole,
    StaffRoleOption,
    TeamMember,
    TeamMemberAccess,
    User,
} from '@/types/auth';

/**
 * Fixture utilisateur pour les tests front. Miroir de StaffSeeder côté PHP.
 */
export function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 1,
        name: 'Admin',
        email: 'admin@admin.fr',
        phone: null,
        role: 'admin',
        avatar: null,
        email_verified_at: '2026-01-01T00:00:00.000000Z',
        two_factor_enabled: false,
        created_at: '2026-01-01T00:00:00.000000Z',
        updated_at: '2026-01-01T00:00:00.000000Z',
        ...overrides,
    };
}

export const admin = makeUser();
export const admin2 = makeUser({
    id: 2,
    name: 'Admin 2',
    email: 'admin2@admin.fr',
});

/** Miroir de StaffRole::cases(). */
export const staffRoles: StaffRoleOption[] = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'manager', label: 'Manager' },
    { value: 'member', label: 'Membre' },
];

/** Membre tel que listé sur la page « Équipe » (miroir de TeamController). */
export function makeTeamMember(
    overrides: Partial<TeamMember> = {},
): TeamMember {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000e1',
        name: 'Admin',
        email: 'admin@admin.fr',
        role: 'admin',
        role_label: 'Administrateur',
        avatar: null,
        two_factor_enabled: false,
        created_at: '2026-01-01T00:00:00+00:00',
        is_me: true,
        can_delete: false,
        function_labels: [],
        custom_permissions: false,
        closed_sections: 0,
        ...overrides,
    };
}

/** Sections où « Gérer » n'ajoute rien (miroir de SiteSection::hasManage()). */
export const noManageSections: SiteSection[] = [
    'leads_create',
    'owner_leads_create',
    'clients',
    'reports',
    'activity',
];

/** Niveaux d'un membre sans personnalisation (miroir de SiteSection::defaultLevel pour `member`). */
export const memberAccess: AccessMap = {
    leads: 'write',
    leads_create: 'write',
    owner_leads: 'write',
    owner_leads_create: 'write',
    clients: 'write',
    visits: 'write',
    agents: 'write',
    partners: 'write',
    owners: 'write',
    properties: 'write',
    quotes: 'read',
    invoices: 'read',
    documents: 'write',
    reports: 'write',
    activity: 'write',
};

export const roleDefaults: Record<StaffRole, AccessMap> = {
    admin: Object.fromEntries(
        Object.keys(memberAccess).map((key) => [
            key,
            noManageSections.includes(key as SiteSection) ? 'write' : 'manage',
        ]),
    ) as AccessMap,
    manager: Object.fromEntries(
        Object.keys(memberAccess).map((key) => [key, 'write']),
    ) as AccessMap,
    member: memberAccess,
};

/** Miroir de AccessLevel::options(). */
export const accessLevels: AccessLevelOption[] = [
    {
        value: 'none',
        label: 'Aucun accès',
        description: 'La section disparaît du menu et ses pages sont refusées.',
    },
    {
        value: 'read',
        label: 'Consulter',
        description: 'Voir les listes et les fiches, sans rien changer.',
    },
    {
        value: 'write',
        label: 'Modifier',
        description: 'Créer, modifier et faire avancer les éléments.',
    },
    {
        value: 'manage',
        label: 'Gérer',
        description: 'Tout, y compris supprimer et les réglages sensibles.',
    },
];

/** Membre sur sa page « Droits et fonctions » (miroir de TeamController::show). */
export function makeTeamMemberAccess(
    overrides: Partial<TeamMemberAccess> = {},
): TeamMemberAccess {
    return {
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000e2',
        name: 'Chloé Martin',
        email: 'chloe@example.com',
        role: 'member',
        role_label: 'Membre',
        avatar: null,
        two_factor_enabled: true,
        created_at: '2026-01-01T00:00:00+00:00',
        is_me: false,
        can_change_role: true,
        functions: [],
        access: memberAccess,
        custom_permissions: false,
        ...overrides,
    };
}

/** Miroir de SiteSection::options(). */
export const siteSections: SiteSectionOption[] = [
    {
        value: 'leads',
        label: 'Leads locataires',
        group: 'Leads',
        manage_hint: 'supprimer un lead',
        has_manage: true,
    },
    {
        value: 'leads_create',
        label: 'Converting Machine (locataires)',
        group: 'Leads',
        manage_hint: 'aucune action supplémentaire',
        has_manage: false,
    },
    {
        value: 'owner_leads',
        label: 'Leads propriétaires',
        group: 'Leads',
        manage_hint: 'supprimer un lead',
        has_manage: true,
    },
    {
        value: 'clients',
        label: 'Dossiers clients',
        group: 'Clients',
        manage_hint: 'aucune action supplémentaire',
        has_manage: false,
    },
    {
        value: 'visits',
        label: 'Visites',
        group: 'Clients',
        manage_hint: 'supprimer une visite',
        has_manage: true,
    },
    {
        value: 'partners',
        label: 'Partenaires',
        group: 'Réseau',
        manage_hint: 'supprimer un partenaire',
        has_manage: true,
    },
    {
        value: 'invoices',
        label: 'Factures',
        group: 'Outils',
        manage_hint: 'supprimer une facture',
        has_manage: true,
    },
    {
        value: 'reports',
        label: 'Rapports',
        group: 'Outils',
        manage_hint: 'aucune action supplémentaire',
        has_manage: false,
    },
    {
        value: 'activity',
        label: "Journal d'activité",
        group: 'Outils',
        manage_hint: 'aucune action supplémentaire',
        has_manage: false,
    },
];

/** Miroir de StaffFunction::options(). */
export const staffFunctions: StaffFunctionOption[] = [
    { value: 'dossiers', label: 'Gestion des dossiers' },
    { value: 'visits', label: 'Agent de visite' },
    { value: 'closing', label: 'Closing et devis' },
    { value: 'billing', label: 'Facturation' },
];
