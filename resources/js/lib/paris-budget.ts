import type { PropertyType } from '@/types';

/*
 * Repères indicatifs de loyer mensuel à Paris, en centimes, pour signaler
 * un budget serré au staff. Ordres de grandeur volontairement prudents,
 * à ajuster dans ce fichier au fil des retours terrain.
 */

type Zone = 'center' | 'middle' | 'outer';

const zoneOf: Record<number, Zone> = {
    1: 'center',
    2: 'center',
    3: 'center',
    4: 'center',
    6: 'center',
    7: 'center',
    8: 'center',
    16: 'center',
    5: 'middle',
    9: 'middle',
    10: 'middle',
    11: 'middle',
    12: 'middle',
    14: 'middle',
    15: 'middle',
    17: 'middle',
    13: 'outer',
    18: 'outer',
    19: 'outer',
    20: 'outer',
};

/** Loyer indicatif d'un studio par zone, puis supplément par taille. */
const studioByZone: Record<Zone, number> = {
    center: 130_000,
    middle: 110_000,
    outer: 95_000,
};

const sizeFactor: Record<PropertyType, number> = {
    studio: 1,
    t1: 1.15,
    t2: 1.55,
    t3: 2.1,
    t4: 2.7,
    grand_appartement: 3.2,
    duplex: 2.8,
    loft: 2.6,
    maison: 3.5,
};

const typeLabels: Record<PropertyType, string> = {
    studio: 'un studio',
    t1: 'un T1',
    t2: 'un T2',
    t3: 'un T3',
    t4: 'un T4',
    grand_appartement: 'un grand appartement',
    duplex: 'un duplex',
    loft: 'un loft',
    maison: 'une maison',
};

export type BudgetHint = {
    /** Loyer indicatif minimal pour le bien le plus modeste dans le quartier le moins cher choisi. */
    minimumCents: number;
    propertyLabel: string;
    zoneLabel: string;
};

/**
 * Repère minimal pour la combinaison la plus abordable des choix faits :
 * le plus petit type de bien coché, dans la zone la moins chère cochée.
 * Sans quartier ni type de bien, pas de repère.
 */
export function budgetHint(
    districts: number[],
    propertyTypes: PropertyType[],
): BudgetHint | null {
    if (districts.length === 0 || propertyTypes.length === 0) {
        return null;
    }

    const zones = districts.map((district) => zoneOf[district] ?? 'outer');
    const cheapestZone: Zone = zones.includes('outer')
        ? 'outer'
        : zones.includes('middle')
          ? 'middle'
          : 'center';
    const smallest = [...propertyTypes].sort(
        (a, b) => sizeFactor[a] - sizeFactor[b],
    )[0] as PropertyType;

    return {
        minimumCents:
            Math.round(
                (studioByZone[cheapestZone] * sizeFactor[smallest]) / 5_000,
            ) * 5_000,
        propertyLabel: typeLabels[smallest],
        zoneLabel:
            cheapestZone === 'center'
                ? 'les arrondissements centraux'
                : cheapestZone === 'middle'
                  ? 'les arrondissements intermédiaires'
                  : 'les arrondissements périphériques',
    };
}

/** Paliers rapides proposés sous le champ budget, en euros. */
export const budgetTiers = [1500, 2000, 2500, 3000, 4000, 5000];
