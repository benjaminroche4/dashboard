/*
 * Repères de budget mensuel à Paris pour situer un lead d'un coup d'œil.
 * Valeurs volontairement simples, à ajuster ici au fil des retours terrain.
 */

/** Seuil sous lequel un budget mensuel est signalé comme serré, en centimes. */
export const TIGHT_BUDGET_CENTS = 130_000;

/** Seuil à partir duquel un budget est confortable, en centimes. */
export const COMFORTABLE_BUDGET_CENTS = 250_000;

/** Arrondissements chers : les seuils y sont relevés d'un quart. */
export const PRICEY_DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 16];

/** Vrai si le budget saisi (en centimes) est en dessous du seuil. */
export function isTightBudget(cents: number): boolean {
    return cents > 0 && cents < TIGHT_BUDGET_CENTS;
}

export type BudgetTier = 'tight' | 'fair' | 'comfortable';

export const budgetTierLabels: Record<BudgetTier, string> = {
    tight: 'Serré',
    fair: 'Correct',
    comfortable: 'Confortable',
};

/**
 * Palier du budget pour les quartiers visés : « serré », « correct » ou
 * « confortable ». Sans quartier, les seuils de base s'appliquent.
 */
export function budgetTier(
    cents: number,
    districts: number[] = [],
): BudgetTier | null {
    if (cents <= 0) {
        return null;
    }

    const pricey =
        districts.length > 0 &&
        districts.every((district) => PRICEY_DISTRICTS.includes(district));
    const factor = pricey ? 1.25 : 1;

    if (cents < TIGHT_BUDGET_CENTS * factor) {
        return 'tight';
    }

    return cents >= COMFORTABLE_BUDGET_CENTS * factor ? 'comfortable' : 'fair';
}
