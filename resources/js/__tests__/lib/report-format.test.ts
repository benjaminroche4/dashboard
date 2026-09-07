import { describe, expect, it } from 'vitest';
import { activeCurrencies, formatDelay, formatRate } from '@/lib/report-format';

describe('formatRate', () => {
    it('renders a French percentage or a dash', () => {
        expect(formatRate(33.3)).toBe('33,3 %');
        expect(formatRate(0)).toBe('0 %');
        expect(formatRate(null)).toBe('—');
    });
});

describe('formatDelay', () => {
    it('scales minutes to hours and days', () => {
        expect(formatDelay(null)).toBe('—');
        expect(formatDelay(12)).toBe('12 min');
        expect(formatDelay(65)).toBe('1 h 05');
        expect(formatDelay(60 * 27)).toBe('1 j 03 h');
    });
});

describe('activeCurrencies', () => {
    it('keeps only currencies with amounts, preferred first', () => {
        expect(
            activeCurrencies(
                [
                    { CHF: 0, EUR: 0 },
                    { CHF: 5, EUR: 9 },
                ],
                'EUR',
            ),
        ).toEqual(['EUR', 'CHF']);
        expect(activeCurrencies([{ CHF: 5, EUR: 0 }], 'EUR')).toEqual(['CHF']);
        expect(activeCurrencies([{ CHF: 0, EUR: 0 }], 'EUR')).toEqual([]);
    });
});
