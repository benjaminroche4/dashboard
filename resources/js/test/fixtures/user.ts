import type { User } from '@/types/auth';

/**
 * Fixture utilisateur pour les tests front. Miroir de StaffSeeder côté PHP.
 */
export function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 1,
        name: 'Admin',
        email: 'admin@admin.fr',
        avatar: undefined,
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
