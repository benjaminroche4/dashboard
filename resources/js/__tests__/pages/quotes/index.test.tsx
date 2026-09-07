import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { role } = vi.hoisted(() => ({ role: { value: 'admin' } }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn() },
    usePage: () => ({ props: { auth: { user: { role: role.value } } } }),
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
}));

import QuotesIndex from '@/pages/quotes/index';
import { makeQuote } from '@/test/fixtures/quote';

describe('Quotes page', () => {
    it('shows the title, the summary, the creation button and the panel table', () => {
        const { container } = render(
            <QuotesIndex
                quotes={[
                    makeQuote({ id: 1, number: 'DV-27001', status: 'sent' }),
                    makeQuote({
                        id: 2,
                        uuid: '0199a9a0-0000-7000-8000-00000000d002',
                        number: 'DV-27002',
                        status: 'accepted',
                        status_label: 'Accepté',
                    }),
                    makeQuote({
                        id: 3,
                        number: 'DV-27003',
                        status: 'declined',
                        status_label: 'Refusé',
                    }),
                ]}
                statuses={[]}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Devis',
        );
        expect(
            screen.getByText('3 devis · 1 en attente · 1 à facturer'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Nouveau devis/ }),
        ).toHaveAttribute('href', '/tools/quotes/create');
        expect(
            container.querySelector('.bg-sidebar.rounded-xl'),
        ).not.toBeNull();
        expect(screen.getAllByRole('row')).toHaveLength(4);
        expect(screen.getByRole('link', { name: 'DV-27002' })).toHaveAttribute(
            'href',
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d002',
        );
    });

    it('hides the creation button from members', () => {
        role.value = 'member';
        render(<QuotesIndex quotes={[makeQuote()]} statuses={[]} />);

        expect(screen.getByText('1 devis · 1 en attente')).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Nouveau devis/ }),
        ).toBeNull();
        role.value = 'admin';
    });

    it('declares breadcrumbs under the tools page', () => {
        expect(
            QuotesIndex.layout.breadcrumbs.map((crumb) => crumb.title),
        ).toEqual(['Outils', 'Devis']);
    });
});
