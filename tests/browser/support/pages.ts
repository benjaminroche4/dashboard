import type { Page } from '@playwright/test';

/** Une étape de résolution : sur la page `list`, prendre le premier lien qui ressemble à `pattern`. */
export type ResolveStep = {
    /** Page à ouvrir ; absente, c'est la page résolue par l'étape précédente. */
    list?: string;
    pattern: RegExp;
};

/**
 * Une page clé à visiter (avec session ; la page de connexion est auditée à part, hors session).
 * Soit une URL fixe (`path`), soit une fiche dont l'UUID est récupéré sur une page de liste
 * via une ou plusieurs étapes (`steps`), jamais en dur.
 */
export type KeyPage = {
    name: string;
    path?: string;
    steps?: ResolveStep[];
};

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const detail = (prefix: string): RegExp => new RegExp(`^/${prefix}/${UUID}$`);

const firstOf = (list: string, prefix: string): ResolveStep[] => [
    { list, pattern: detail(prefix) },
];

export const keyPages: KeyPage[] = [
    { name: 'Tableau de bord', path: '/dashboard' },
    { name: 'Leads : liste', path: '/locataires' },
    { name: 'Leads : création', path: '/locataires/create' },
    {
        // Les cartes du kanban n'ont pas de lien : on passe par le premier dossier client
        // (un client est un lead converti) et son bouton « Fiche lead ».
        name: 'Lead : fiche',
        steps: [
            { list: '/clients', pattern: detail('clients') },
            { pattern: detail('locataires') },
        ],
    },
    { name: 'Leads propriétaires', path: '/owners/leads' },
    { name: 'Dossiers clients', path: '/clients' },
    { name: 'Dossier client', steps: firstOf('/clients', 'clients') },
    { name: 'Visites', path: '/clients/visits' },
    { name: 'Agents', path: '/real-estate/agents' },
    { name: 'Agences', path: '/real-estate/agencies' },
    { name: 'Partenaires', path: '/partners' },
    { name: 'Partenaire : fiche', steps: firstOf('/partners', 'partners') },
    { name: 'Biens', path: '/properties' },
    { name: 'Propriétaires', path: '/owners' },
    { name: 'Devis : liste', path: '/tools/quotes' },
    { name: 'Devis : création', path: '/tools/quotes/create' },
    { name: 'Devis : fiche', steps: firstOf('/tools/quotes', 'tools/quotes') },
    { name: 'Factures : liste', path: '/invoices' },
    { name: 'Factures : création', path: '/invoices/create' },
    { name: 'Facture : fiche', steps: firstOf('/invoices', 'invoices') },
    { name: 'Documents : liste', path: '/tools/documents' },
    { name: 'Documents : création', path: '/tools/documents/create' },
    { name: 'Rapports', path: '/tools/reports' },
    { name: 'Paramètres : profil', path: '/settings/profile' },
    { name: 'Paramètres : sécurité', path: '/settings/security' },
    { name: 'Paramètres : apparence', path: '/settings/appearance' },
    { name: 'Paramètres : équipe', path: '/settings/team' },
];

async function firstLink(
    page: Page,
    list: string,
    pattern: RegExp,
): Promise<string | null> {
    await page.goto(list, { waitUntil: 'networkidle' });
    const hrefs = await page
        .locator('main a[href]')
        .evaluateAll((anchors) =>
            anchors.map(
                (anchor) =>
                    new URL((anchor as HTMLAnchorElement).href).pathname,
            ),
        );
    return hrefs.find((href) => pattern.test(href)) ?? null;
}

/**
 * Résout l'URL d'une page clé : pour une fiche, ouvre la liste et prend le premier lien
 * dont le chemin correspond au motif, étape par étape. Renvoie `null` si une liste est vide.
 */
export async function resolvePath(
    page: Page,
    keyPage: KeyPage,
): Promise<string | null> {
    if (keyPage.path) {
        return keyPage.path;
    }
    if (!keyPage.steps?.length) {
        throw new Error(`Page clé « ${keyPage.name} » sans chemin ni étapes.`);
    }
    let current: string | null = null;
    for (const step of keyPage.steps) {
        const list = step.list ?? current;
        if (!list) {
            return null;
        }
        current = await firstLink(page, list, step.pattern);
        if (current === null) {
            return null;
        }
    }
    return current;
}
