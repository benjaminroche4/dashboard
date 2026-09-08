import { describe, expect, it } from 'vitest';
import { canAccessSection, filterNavGroups } from '@/lib/nav-access';
import { memberAccess } from '@/test/fixtures/user';
import type { AccessMap, NavGroup } from '@/types';

/** Tout fermé sauf les sections données. */
const only = (...open: (keyof AccessMap)[]): AccessMap =>
    Object.fromEntries(
        Object.keys(memberAccess).map((key) => [
            key,
            open.includes(key as keyof AccessMap) ? 'read' : 'none',
        ]),
    ) as AccessMap;

const groups: NavGroup[] = [
    { label: '', items: [{ title: 'Tableau de bord', href: '/dashboard' }] },
    {
        label: 'Leads',
        items: [
            {
                title: 'Locataires',
                href: '/locataires',
                items: [
                    {
                        title: 'Leads locataires',
                        href: '/locataires',
                        section: 'leads',
                    },
                    {
                        title: 'Converting Machine',
                        href: '/locataires/create',
                        section: 'leads_create',
                    },
                ],
            },
        ],
    },
    {
        label: 'Réseau',
        items: [
            { title: 'Partenaires', href: '/partners', section: 'partners' },
        ],
    },
    {
        label: 'Outils',
        items: [
            {
                title: 'Outils',
                href: '/tools',
                items: [
                    {
                        title: 'Tous les outils',
                        href: '/tools',
                        anySection: ['quotes', 'invoices'],
                    },
                    {
                        title: 'Devis',
                        href: '/tools/quotes',
                        section: 'quotes',
                    },
                    {
                        title: 'Factures',
                        href: '/invoices',
                        section: 'invoices',
                    },
                ],
            },
            { title: 'Rapports', href: '/tools/reports', section: 'reports' },
        ],
    },
];

describe('nav access', () => {
    it('opens everything when no restriction applies', () => {
        expect(canAccessSection(null, 'invoices')).toBe(true);
        expect(canAccessSection(only('leads'), 'invoices')).toBe(false);
        expect(canAccessSection(memberAccess, 'invoices')).toBe(true);
        expect(filterNavGroups(groups, null)).toBe(groups);
    });

    it('keeps only the open sections, drops emptied menus and groups, and keeps section-less links', () => {
        const filtered = filterNavGroups(
            groups,
            only('leads_create', 'invoices'),
        );

        expect(filtered.map((group) => group.label)).toEqual([
            '',
            'Leads',
            'Outils',
        ]);
        expect(filtered[1]?.items[0]?.items?.map((sub) => sub.title)).toEqual([
            'Converting Machine',
        ]);
        // Le menu dépliable mène au premier sous-lien restant.
        expect(filtered[1]?.items[0]?.href).toBe('/locataires/create');
        expect(filtered[2]?.items.map((item) => item.title)).toEqual([
            'Outils',
        ]);
        expect(filtered[2]?.items[0]?.items?.map((sub) => sub.title)).toEqual([
            'Tous les outils',
            'Factures',
        ]);
    });

    it('hides « Tous les outils » when no tool is open', () => {
        const filtered = filterNavGroups(groups, only('reports'));

        expect(filtered.map((group) => group.label)).toEqual(['', 'Outils']);
        expect(filtered[1]?.items.map((item) => item.title)).toEqual([
            'Rapports',
        ]);
    });
});
