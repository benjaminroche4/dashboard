import { describe, expect, it } from 'vitest';
import { budgetTier, isTightBudget } from '@/lib/paris-budget';

describe('paris-budget', () => {
    it('flags tight budgets', () => {
        expect(isTightBudget(120_000)).toBe(true);
        expect(isTightBudget(130_000)).toBe(false);
        expect(isTightBudget(0)).toBe(false);
    });

    it('tiers the budget, with higher thresholds in pricey districts', () => {
        expect(budgetTier(0)).toBeNull();
        expect(budgetTier(120_000)).toBe('tight');
        expect(budgetTier(150_000)).toBe('fair');
        expect(budgetTier(250_000)).toBe('comfortable');
        // 1 500 € suffisent dans le 19e mais restent serrés dans le 7e.
        expect(budgetTier(150_000, [19])).toBe('fair');
        expect(budgetTier(150_000, [7])).toBe('tight');
        expect(budgetTier(250_000, [7, 8])).toBe('fair');
    });
});
