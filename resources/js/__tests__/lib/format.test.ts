import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from '@/lib/format';

describe('format helpers', () => {
    it('formats cents as French euros', () => {
        expect(formatMoney(125_000).replace(/ | /g, ' ')).toBe('1 250,00 €');
    });

    it('formats ISO dates in short French', () => {
        expect(formatDate('2026-09-04')).toBe('04 sept. 2026');
    });
});
