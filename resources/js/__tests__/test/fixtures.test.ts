import { describe, expect, it } from 'vitest';
import { admin, admin2, makeUser } from '@/test/fixtures/user';

describe('user fixtures', () => {
    it('mirrors the PHP staff seeder accounts', () => {
        expect(admin.email).toBe('admin@admin.fr');
        expect(admin2.email).toBe('admin2@admin.fr');
    });

    it('accepts overrides', () => {
        expect(makeUser({ name: 'Zoé' }).name).toBe('Zoé');
    });
});
