import { describe, expect, it } from 'vitest';
import { rentRange } from '@/lib/agency-profile';

describe('agency profile helpers', () => {
    it('phrases a rent range', () => {
        // Intl fr-FR sépare les milliers d'une espace fine insécable.
        expect(rentRange(120000, 250000)).toMatch(
            /^1.200 € – 2.500 € \/ mois$/,
        );
        expect(rentRange(null, 250000)).toMatch(/^jusqu’à 2.500 € \/ mois$/);
        expect(rentRange(120000, null)).toMatch(
            /^à partir de 1.200 € \/ mois$/,
        );
        expect(rentRange(null, null)).toBeNull();
    });
});
