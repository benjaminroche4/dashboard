/**
 * Sélection dans la navigation : un lien reste actif sur toutes les pages de
 * sa section (« Factures » sur /invoices, /invoices/create, /invoices/12).
 */

function normalize(path: string): string {
    const trimmed = path.replace(/\/+$/, '');

    return trimmed === '' ? '/' : trimmed;
}

/** Vrai si le chemin courant est la page du lien ou une de ses sous-pages. */
export function matchesSection(href: string, currentPath: string): boolean {
    if (href === '#' || href === '') {
        return false;
    }

    const base = normalize(href);
    const current = normalize(currentPath);

    if (base === '/') {
        return current === '/';
    }

    return current === base || current.startsWith(`${base}/`);
}

/**
 * Parmi des liens frères, celui qui correspond le plus précisément au chemin
 * courant (le plus long préfixe), ou null. Ainsi /leads/create sélectionne
 * « Converting Machine » (/leads/create) et non « Liste des leads » (/leads).
 */
export function activeHref(
    hrefs: string[],
    currentPath: string,
): string | null {
    let best: string | null = null;

    for (const href of hrefs) {
        if (
            matchesSection(href, currentPath) &&
            (best === null || normalize(href).length > normalize(best).length)
        ) {
            best = href;
        }
    }

    return best;
}
