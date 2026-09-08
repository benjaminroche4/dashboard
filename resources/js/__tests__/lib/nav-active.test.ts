import { describe, expect, it } from 'vitest';
import { activeHref, matchesSection } from '@/lib/nav-active';

describe('matchesSection', () => {
    it('matches the page itself and its sub-pages only', () => {
        expect(matchesSection('/invoices', '/invoices')).toBe(true);
        expect(matchesSection('/invoices', '/invoices/create')).toBe(true);
        expect(matchesSection('/invoices', '/invoices/12')).toBe(true);
        expect(matchesSection('/invoices', '/invoices-archive')).toBe(false);
        expect(matchesSection('/invoices', '/locataires')).toBe(false);
        expect(matchesSection('/invoices/', '/invoices')).toBe(true);
    });

    it('ignores placeholders and keeps the root exact', () => {
        expect(matchesSection('#', '/anything')).toBe(false);
        expect(matchesSection('', '/anything')).toBe(false);
        expect(matchesSection('/', '/')).toBe(true);
        expect(matchesSection('/', '/locataires')).toBe(false);
    });
});

describe('activeHref', () => {
    const hrefs = ['/locataires', '/locataires/create', '/invoices'];

    it('picks the most specific sibling', () => {
        expect(activeHref(hrefs, '/locataires')).toBe('/locataires');
        expect(activeHref(hrefs, '/locataires/create')).toBe(
            '/locataires/create',
        );
        expect(activeHref(hrefs, '/locataires/42')).toBe('/locataires');
        expect(activeHref(hrefs, '/locataires/42/edit')).toBe('/locataires');
        expect(activeHref(hrefs, '/invoices/7')).toBe('/invoices');
    });

    it('returns null outside every section', () => {
        expect(activeHref(hrefs, '/tools/documents')).toBeNull();
        expect(activeHref([], '/locataires')).toBeNull();
    });
});
