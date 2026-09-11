/**
 * Règle du loyer sur les revenus : un loyer est tenable quand les revenus
 * mensuels nets du foyer valent au moins trois fois ce loyer. Calculs purs,
 * en centimes, partagés par le dossier et la fiche lead.
 */
export const RENT_INCOME_RATIO = 3;

export type Affordability = {
    /** Revenus du foyer (locataires et garants), en centimes. */
    incomeCents: number;
    /** Loyer visé, en centimes. */
    rentCents: number;
    /** Revenus divisés par le loyer (2.4 = 2,4 fois le loyer). */
    ratio: number;
    /** Le loyer tient dans les revenus. */
    ok: boolean;
    /** Revenus qu'il faudrait pour ce loyer. */
    requiredIncomeCents: number;
    /** Loyer tenable avec ces revenus. */
    affordableRentCents: number;
};

/**
 * Compare les revenus au loyer visé. Renvoie `null` quand l'un des deux
 * manque : sans chiffre, pas d'alerte.
 */
export function affordability(
    incomeCents: number | null | undefined,
    rentCents: number | null | undefined,
): Affordability | null {
    if (!incomeCents || !rentCents || incomeCents <= 0 || rentCents <= 0) {
        return null;
    }

    const ratio = incomeCents / rentCents;

    return {
        incomeCents,
        rentCents,
        ratio,
        ok: ratio >= RENT_INCOME_RATIO,
        requiredIncomeCents: rentCents * RENT_INCOME_RATIO,
        affordableRentCents: Math.floor(incomeCents / RENT_INCOME_RATIO),
    };
}

/** Somme des revenus connus, null si aucun n'est renseigné. */
export function totalIncomeCents(
    amounts: (number | null | undefined)[],
): number | null {
    const known = amounts.filter(
        (amount): amount is number => typeof amount === 'number',
    );

    return known.length === 0
        ? null
        : known.reduce((total, amount) => total + amount, 0);
}
