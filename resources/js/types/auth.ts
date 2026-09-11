export type StaffRole = 'admin' | 'manager' | 'member';

export const staffRoleLabels: Record<StaffRole, string> = {
    admin: 'Administrateur',
    manager: 'Manager',
    member: 'Membre',
};

export type User = {
    id: number;
    name: string;
    email: string;
    /** Téléphone au format international, pour les alertes par SMS. */
    phone: string | null;
    role: StaffRole;
    avatar: string | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

/** Sections du site qu'un administrateur ouvre ou ferme à un membre (miroir de SiteSection). */
export type SiteSection =
    | 'leads'
    | 'leads_create'
    | 'owner_leads'
    | 'owner_leads_create'
    | 'clients'
    | 'visits'
    | 'agents'
    | 'partners'
    | 'owners'
    | 'properties'
    | 'quotes'
    | 'invoices'
    | 'documents'
    | 'reports'
    | 'activity';

export type SiteSectionOption = {
    value: SiteSection;
    label: string;
    /** Groupe du menu (Leads, Clients, Réseau, Outils). */
    group: string;
    /** Ce que « Gérer » ajoute dans cette section. */
    manage_hint: string;
    /** Faux quand « Gérer » n'ajoute rien : le niveau n'est pas proposé. */
    has_manage: boolean;
};

/** Niveau d'accès à une section (miroir de AccessLevel). */
export type AccessLevel = 'none' | 'read' | 'write' | 'manage';

export type AccessLevelOption = {
    value: AccessLevel;
    label: string;
    description: string;
};

/** Niveau effectif par section. */
export type AccessMap = Record<SiteSection, AccessLevel>;

/** Fonctions d'un membre (miroir de StaffFunction). */
export type StaffFunction =
    | 'dossiers'
    | 'visits'
    | 'closing'
    | 'prospecting'
    | 'billing'
    | 'partners';

export type StaffFunctionOption = { value: StaffFunction; label: string };

/** Entrée de l'annuaire du staff partagé avec le front. */
export type StaffDirectoryEntry = {
    id: number;
    name: string;
    role: StaffRole;
    avatar: string | null;
    /** Libellés des fonctions (« Agent de visite »…). */
    functions?: string[];
};

/** Membre listé sur la page « Équipe » des paramètres. */
export type TeamMember = {
    id: number;
    uuid: string;
    name: string;
    email: string;
    role: StaffRole;
    role_label: string;
    avatar: string | null;
    two_factor_enabled: boolean;
    created_at: string | null;
    /** Le membre connecté lui-même. */
    is_me: boolean;
    /** Un admin ne retire jamais son propre accès. */
    can_delete: boolean;
    function_labels: string[];
    /** Des droits différents de ceux du rôle ont été posés. */
    custom_permissions: boolean;
    /** Nombre de sections fermées (niveau « Aucun accès »). */
    closed_sections: number;
};

/** Membre sur sa page « Droits et fonctions ». */
export type TeamMemberAccess = {
    id: number;
    uuid: string;
    name: string;
    email: string;
    role: StaffRole;
    role_label: string;
    avatar: string | null;
    two_factor_enabled: boolean;
    created_at: string | null;
    is_me: boolean;
    /** Un admin ne change jamais son propre rôle. */
    can_change_role: boolean;
    functions: StaffFunction[];
    access: AccessMap;
    custom_permissions: boolean;
};

export type TeamAccessForm = {
    role: StaffRole;
    permissions: AccessMap;
    functions: StaffFunction[];
};

export type StaffRoleOption = { value: StaffRole; label: string };

export type TeamMemberForm = {
    name: string;
    email: string;
    role: StaffRole;
    password: string;
    password_confirmation: string;
};

export type Permissions = {
    manageStaff: boolean;
    viewPulse: boolean;
};

export type Auth = {
    user: User;
    can: Permissions;
    /** Niveau d'accès du membre connecté par section ; absent = tout ouvert. */
    access?: AccessMap | null;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
