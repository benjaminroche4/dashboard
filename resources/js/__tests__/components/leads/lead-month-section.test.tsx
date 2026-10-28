import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
}));

import { LeadMonthSection } from '@/components/leads/lead-month-section';
import { makeLead } from '@/test/fixtures/lead';

describe('LeadMonthSection', () => {
    it('renders the month as a region with its count and one row per lead', () => {
        render(
            <LeadMonthSection
                group={{
                    key: '2026-11',
                    label: 'Novembre 2026',
                    leads: [
                        makeLead({ id: 1, name: 'Léa Durand' }),
                        makeLead({ id: 2, name: 'Marc Petit', uuid: 'u-2' }),
                    ],
                }}
            />,
        );

        const section = screen.getByRole('region', { name: 'Novembre 2026' });
        expect(section).toHaveAttribute('data-month', '2026-11');
        expect(within(section).getByText('2 leads')).toBeInTheDocument();
        const rows = within(section).getAllByRole('row');
        // Une ligne d'en-tête puis une par lead.
        expect(rows).toHaveLength(3);
        expect(
            within(section).getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', expect.stringMatching(/^\/locataires\//));
    });

    it('says « 1 lead » in the singular', () => {
        render(
            <LeadMonthSection
                group={{ key: 'none', label: 'Sans date', leads: [makeLead()] }}
            />,
        );

        expect(screen.getByText('1 lead')).toBeInTheDocument();
    });
});
