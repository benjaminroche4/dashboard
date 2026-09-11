import { describe, expect, it } from 'vitest';
import {
    affordability,
    RENT_INCOME_RATIO,
    totalIncomeCents,
} from '@/lib/rent-affordability';

describe('affordability', () => {
    it('accepts a rent covered three times by the income', () => {
        const result = affordability(450_000, 150_000);

        expect(result).not.toBeNull();
        expect(result?.ok).toBe(true);
        expect(result?.ratio).toBe(3);
        expect(result?.requiredIncomeCents).toBe(150_000 * RENT_INCOME_RATIO);
    });

    it('flags a rent too high for the income and says what would fit', () => {
        const result = affordability(320_000, 150_000);

        expect(result?.ok).toBe(false);
        expect(result?.ratio).toBeCloseTo(2.13, 2);
        expect(result?.requiredIncomeCents).toBe(450_000);
        expect(result?.affordableRentCents).toBe(106_666);
    });

    it('says nothing without one of the two figures', () => {
        expect(affordability(null, 150_000)).toBeNull();
        expect(affordability(450_000, null)).toBeNull();
        expect(affordability(0, 150_000)).toBeNull();
    });
});

describe('totalIncomeCents', () => {
    it('adds up what is known and stays null when nothing is', () => {
        expect(totalIncomeCents([300_000, null, 250_000])).toBe(550_000);
        expect(totalIncomeCents([null, undefined])).toBeNull();
    });
});
