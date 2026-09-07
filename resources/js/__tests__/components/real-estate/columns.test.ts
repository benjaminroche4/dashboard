import { describe, expect, it } from 'vitest';
import { formatAddress } from '@/components/real-estate/columns';
import { makeAgency } from '@/test/fixtures/real-estate';

describe('formatAddress', () => {
    it('joins street, postal code and city, skipping the blanks', () => {
        expect(formatAddress(makeAgency())).toBe(
            '12 rue de Turenne, 75003 Paris',
        );
        expect(formatAddress(makeAgency({ street: null }))).toBe('75003 Paris');
        expect(
            formatAddress(
                makeAgency({ street: null, postal_code: null, city: null }),
            ),
        ).toBeNull();
    });
});
