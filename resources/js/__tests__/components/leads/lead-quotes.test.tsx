import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import { LeadQuotes } from '@/components/leads/lead-quotes';

const uuid = '0199a9a0-0000-7000-8000-000000000007';

describe('LeadQuotes', () => {
    it('lists the quotes with amount and status, and links to a prefilled creation', () => {
        render(
            <LeadQuotes
                leadUuid={uuid}
                canEdit
                quotes={[
                    {
                        id: 3,
                        uuid: '0199a9a0-0000-7000-8000-00000000d001',
                        number: 'DV-27003',
                        client_name: 'Léa Durand',
                        amount_cents: 128_639,
                        currency: 'EUR',
                        status: 'sent',
                        status_label: 'Envoyé',
                        issued_at: '2026-09-07',
                        valid_until: '2026-10-07',
                    },
                ]}
            />,
        );

        expect(screen.getByRole('link', { name: /DV-27003/ })).toHaveAttribute(
            'href',
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001',
        );
        expect(screen.getByText('Envoyé')).toHaveAttribute(
            'data-status',
            'sent',
        );
        expect(screen.getByText(/1.286,39/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Créer un devis/ }),
        ).toHaveAttribute('href', `/tools/quotes/create?lead=${uuid}`);
    });

    it('shows an empty state and no creation link for members', () => {
        render(<LeadQuotes leadUuid={uuid} quotes={[]} canEdit={false} />);

        expect(
            screen.getByText('Aucun devis pour ce lead.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Créer un devis/ }),
        ).toBeNull();
    });
});
