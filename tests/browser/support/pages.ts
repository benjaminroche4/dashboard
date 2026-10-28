import type { Page } from '@playwright/test';

/** Une étape de résolution : sur la page `list`, prendre le premier lien qui ressemble à `pattern`. */
export type ResolveStep =
    | {
          /** Page à ouvrir ; absente, c'est la page résolue par l'étape précédente. */
          list?: string;
          pattern: RegExp;
          /** Ne retenir qu'un lien dont la ligne de tableau (`tr`) contient ce texte. */
          near?: RegExp;
          /** Entrées `localStorage` à poser avant de lire la liste (vue Tableau, par exemple). */
          storage?: Record<string, string>;
      }
    | {
          /**
           * Chemin dérivé de la page précédente sans la visiter : pour une
           * page qu'aucun lien n'atteint (bouton `router.visit`, entrée d'un
           * menu « ⋯ ») ou dont l'identifiant est déjà connu.
           */
          derive: (current: string) => string;
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
    { name: 'Aujourd’hui', path: '/dashboard' },
    { name: 'Leads : liste', path: '/locataires' },
    { name: 'Leads : création', path: '/locataires/create' },
    {
        // Les cartes du kanban n'ont pas de lien : on passe par le premier dossier client
        // (un client est un lead converti) et son bouton « Fiche lead ».
        name: 'Lead : fiche',
        steps: [
            { list: '/clients', pattern: detail('clients') },
            // Un client est un lead converti : même UUID, la fiche lead se
            // déduit du dossier (son bouton vit dans le menu « ⋯ »).
            { derive: (client) => client.replace('/clients/', '/locataires/') },
        ],
    },
    {
        name: 'Lead : modification',
        steps: [
            { list: '/clients', pattern: detail('clients') },
            {
                derive: (client) =>
                    `${client.replace('/clients/', '/locataires/')}/edit`,
            },
        ],
    },
    { name: 'Leads propriétaires', path: '/owners/leads' },
    { name: 'Lead propriétaire : création', path: '/owners/leads/create' },
    {
        name: 'Lead propriétaire : modification',
        steps: [
            // Le kanban n'a pas de liens : on bascule la liste en vue Tableau.
            {
                list: '/owners/leads',
                pattern: detail('locataires'),
                storage: { 'owners.leads.view': 'table' },
            },
            {
                derive: (lead) =>
                    `${lead.replace('/locataires/', '/owners/leads/')}/edit`,
            },
        ],
    },
    { name: 'Dossiers clients', path: '/clients' },
    { name: 'Dossier client', steps: firstOf('/clients', 'clients') },
    {
        name: 'Dossier client : modification',
        steps: [
            { list: '/clients', pattern: detail('clients') },
            { derive: (client) => `${client}/edit` },
        ],
    },
    { name: 'Visites', path: '/clients/visits' },
    {
        name: 'Visite : fiche',
        steps: firstOf('/clients/visits', 'clients/visits'),
    },
    {
        name: 'Visite : modification',
        steps: [
            { list: '/clients/visits', pattern: detail('clients/visits') },
            { derive: (visit) => `${visit}/edit` },
        ],
    },
    { name: 'Agents', path: '/real-estate/agents' },
    { name: 'Agences', path: '/real-estate/agencies' },
    { name: 'Partenaires', path: '/partners' },
    { name: 'Partenaire : fiche', steps: firstOf('/partners', 'partners') },
    { name: 'Entreprises', path: '/companies' },
    { name: 'Entreprise : fiche', steps: firstOf('/companies', 'companies') },
    {
        name: 'Agent : fiche',
        steps: firstOf('/real-estate/agents', 'real-estate/agents'),
    },
    {
        name: 'Agence : fiche',
        steps: firstOf('/real-estate/agencies', 'real-estate/agencies'),
    },
    { name: 'Biens', path: '/properties' },
    { name: 'Bien : création', path: '/properties/create' },
    { name: 'Bien : fiche', steps: firstOf('/properties', 'properties') },
    {
        name: 'Bien : modification',
        steps: [
            { list: '/properties', pattern: detail('properties') },
            // « Modifier » est un bouton (`router.visit`), pas un lien.
            { derive: (property) => `${property}/edit` },
        ],
    },
    { name: 'Visite : création', path: '/clients/visits/create' },
    { name: 'Propriétaires', path: '/owners' },
    { name: 'Propriétaire : fiche', steps: firstOf('/owners', 'owners') },
    { name: 'Devis : liste', path: '/tools/quotes' },
    { name: 'Devis : création', path: '/tools/quotes/create' },
    { name: 'Devis : fiche', steps: firstOf('/tools/quotes', 'tools/quotes') },
    {
        name: 'Devis : modification',
        steps: [
            // Seul un brouillon se modifie : un devis envoyé répond 403, à raison.
            {
                list: '/tools/quotes',
                pattern: detail('tools/quotes'),
                near: /Brouillon/,
            },
            { derive: (quote) => `${quote}/edit` },
        ],
    },
    { name: 'Factures : liste', path: '/invoices' },
    { name: 'Factures : création', path: '/invoices/create' },
    { name: 'Facture : fiche', steps: firstOf('/invoices', 'invoices') },
    {
        name: 'Facture : modification',
        steps: [
            // Seule une facture en brouillon se modifie.
            { list: '/invoices?status=draft', pattern: detail('invoices') },
            { derive: (invoice) => `${invoice}/edit` },
        ],
    },
    { name: 'Documents : liste', path: '/tools/documents' },
    {
        name: 'Documents : catalogue des pièces',
        path: '/tools/documents/catalog',
    },
    { name: 'Documents : création', path: '/tools/documents/create' },
    {
        name: 'Documents : fiche',
        steps: firstOf('/tools/documents', 'tools/documents'),
    },
    {
        name: 'Documents : modification',
        steps: [
            { list: '/tools/documents', pattern: detail('tools/documents') },
            { derive: (request) => `${request}/edit` },
        ],
    },
    {
        // Seule page vue par des gens hors de l'équipe : le jeton de dépôt est
        // lu sur la fiche d'une liste, jamais écrit en dur.
        name: 'Dépôt public des pièces',
        steps: [
            { list: '/tools/documents', pattern: detail('tools/documents') },
            { pattern: /^\/depot\/[A-Za-z0-9]{48}$/ },
        ],
    },
    { name: "Journal d'activité", path: '/tools/activity' },
    { name: 'Paramètres : profil', path: '/settings/profile' },
    { name: 'Paramètres : sécurité', path: '/settings/security' },
    { name: 'Paramètres : apparence', path: '/settings/appearance' },
    { name: 'Paramètres : équipe', path: '/settings/team' },
    {
        name: 'Paramètres : droits d’un membre',
        steps: firstOf('/settings/team', 'settings/team'),
    },
];

async function firstLink(
    page: Page,
    list: string,
    pattern: RegExp,
    near?: RegExp,
    storage?: Record<string, string>,
): Promise<string | null> {
    if (storage) {
        // `localStorage` n'est accessible que sur l'origine : ouvrir la page une
        // première fois, poser les clés, puis la laisser se recharger ci-dessous.
        await page.goto(list, { waitUntil: 'domcontentloaded' });
        await page.evaluate((entries) => {
            for (const [key, value] of Object.entries(entries)) {
                localStorage.setItem(key, value);
            }
        }, storage);
    }
    // Pas `networkidle` : la connexion Reverb reste ouverte et, en dev, Vite
    // recharge en fond — le réseau ne s'endort jamais et le hook expire. Le
    // DOM chargé suffit pour lire le premier lien de la liste.
    // Pas `networkidle` : la connexion Reverb reste ouverte et, en dev, Vite
    // recharge en fond — le réseau ne s'endort jamais et le hook expirait. On
    // attend le premier lien qui corresponde vraiment au motif : sans cette
    // attente la fiche n'était pas résolue et le test se marquait « skipped »,
    // donc non vérifié.
    await page.goto(list, { waitUntil: 'domcontentloaded' });
    await page
        .waitForFunction(
            (source) =>
                [...document.querySelectorAll('main a[href]')].some((anchor) =>
                    new RegExp(source).test(
                        new URL((anchor as HTMLAnchorElement).href).pathname,
                    ),
                ),
            pattern.source,
            { timeout: 10_000 },
        )
        .catch(() => undefined);
    // Le chargement doit être fini avant de rendre la main : un `goto` lancé
    // par le test suivant sur une page encore en cours de chargement se fait
    // supplanter, et Playwright lui répond `null` au lieu d'une réponse.
    await page.waitForLoadState('load');
    const links = await page.locator('main a[href]').evaluateAll((anchors) =>
        anchors.map((anchor) => ({
            path: new URL((anchor as HTMLAnchorElement).href).pathname,
            row: anchor.closest('tr')?.textContent ?? '',
        })),
    );
    if (storage) {
        // Ne pas laisser la préférence posée : les pages clés s'auditent dans
        // leur état par défaut.
        await page.evaluate((entries) => {
            for (const key of Object.keys(entries)) {
                localStorage.removeItem(key);
            }
        }, storage);
    }
    return (
        links.find(
            (link) => pattern.test(link.path) && (!near || near.test(link.row)),
        )?.path ?? null
    );
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
        if ('derive' in step) {
            if (!current) {
                return null;
            }
            current = step.derive(current);
            continue;
        }
        const list = step.list ?? current;
        if (!list) {
            return null;
        }
        current = await firstLink(
            page,
            list,
            step.pattern,
            step.near,
            step.storage,
        );
        if (current === null) {
            return null;
        }
    }
    return current;
}
