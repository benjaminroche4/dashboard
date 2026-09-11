/** Élément d'une barre de pagination : un numéro de page ou une ellipse. */
export type PageItem = number | 'gap';

/**
 * Numéros de page à afficher autour de la page courante, la première et la
 * dernière restant toujours accessibles : 1 … 8 9 [10] 11 12 … 372.
 */
export function paginationRange(
    current: number,
    last: number,
    siblings = 1,
): PageItem[] {
    if (last <= 1) {
        return [1];
    }

    const page = Math.min(Math.max(current, 1), last);
    // Première, dernière, la courante, ses voisines et les deux ellipses.
    const window = siblings * 2 + 5;

    if (last <= window) {
        return Array.from({ length: last }, (_, index) => index + 1);
    }

    const start = Math.max(page - siblings, 1);
    const end = Math.min(page + siblings, last);
    const items: PageItem[] = [1];

    if (start > 2) {
        items.push('gap');
    }
    for (
        let number = Math.max(start, 2);
        number <= Math.min(end, last - 1);
        number++
    ) {
        items.push(number);
    }
    if (end < last - 1) {
        items.push('gap');
    }
    items.push(last);

    return items;
}
