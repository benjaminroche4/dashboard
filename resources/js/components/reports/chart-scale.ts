/**
 * Réglages d'échelle partagés par les graphiques des rapports : ils dépendent
 * du nombre de tranches, qui varie avec la période choisie.
 */

/** Un libellé d'axe sur n, pour ne jamais dépasser une douzaine de graduations. */
export function tickInterval(points: number): number {
    return points <= 12 ? 0 : Math.ceil(points / 12) - 1;
}

/**
 * Au-delà d'une douzaine de tranches, un chiffre sur chaque barre devient
 * illisible : seul le pic est annoté, l'axe et le survol portent le reste.
 */
export function labelsEverywhere(points: number): boolean {
    return points <= 12;
}

/**
 * Valeur à écrire sur une barre : rien sur les tranches vides, rien hors du pic
 * quand la période est longue.
 */
export function barLabel(
    value: unknown,
    { everywhere, peak }: { everywhere: boolean; peak: number },
): string {
    if (typeof value !== 'number' || value <= 0) {
        return '';
    }

    return everywhere || value === peak ? String(value) : '';
}
