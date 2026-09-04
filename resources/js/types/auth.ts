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
    role: StaffRole;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

/** Entrée de l'annuaire du staff partagé avec le front. */
export type StaffDirectoryEntry = {
    id: number;
    name: string;
    role: StaffRole;
};

export type Permissions = {
    manageStaff: boolean;
    viewPulse: boolean;
};

export type Auth = {
    user: User;
    can: Permissions;
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
