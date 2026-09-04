import { describe, expect, it } from 'vitest';
import { staffRoleLabels } from '@/types/auth';

describe('staffRoleLabels', () => {
    it('labels every role known to the backend', () => {
        expect(Object.keys(staffRoleLabels).sort()).toEqual([
            'admin',
            'manager',
            'member',
        ]);
    });
});
