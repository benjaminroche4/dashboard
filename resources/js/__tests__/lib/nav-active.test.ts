import { describe, expect, it } from 'vitest';
import { activeHref, matchesSection } from '@/lib/nav-active';

describe('matchesSection', () => {
    it('matches the page itself and its sub-pages only', () => {
        expect(matchesSection('/invoices', '/invoices')).toBe(true);
        expect(matchesSection('/invoices', '/invoices/create')).toBe(true);
        expect(matchesSection('/invoices', '/invoices/12')).toBe(true);
        expect(matchesSection('/invoices', '/invoices-archive')).toBe(false);
        expect(matchesSection('/invoices', '/leads')).toBe(false);
        expect(matchesSection('/invoices/', '/invoices')).toBe(true);
    });

    it('ignores placeholders and keeps the root exact', () => {
        expect(matchesSection('#', '/anything')).toBe(false);
        expect(matchesSection('', '/anything')).toBe(false);
        expect(matchesSection('/', '/')).toBe(true);
        expect(matchesSection('/', '/leads')).toBe(false);
    });
});

describe('activeHref', () => {
    const hrefs = ['/leads', '/leads/create', '/invoices'];

    it('picks the most specific sibling', () => {
        expect(activeHref(hrefs, '/leads')).toBe('/leads');
        expect(activeHref(hrefs, '/leads/create')).toBe('/leads/create');
        expect(activeHref(hrefs, '/leads/42')).toBe('/leads');
        expect(activeHref(hrefs, '/leads/42/edit')).toBe('/leads');
        expect(activeHref(hrefs, '/invoices/7')).toBe('/invoices');
    });

    it('returns null outside every section', () => {
        expect(activeHref(hrefs, '/tools/documents')).toBeNull();
        expect(activeHref([], '/leads')).toBeNull();
    });
});
