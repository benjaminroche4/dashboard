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

import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';

describe('LeadDocumentRequests', () => {
    it('lists the lead lists and links to a prefilled creation', () => {
        render(
            <LeadDocumentRequests
                leadId={7}
                requests={[
                    {
                        id: 3,
                        name: 'Léa Durand',
                        person_count: 2,
                        document_count: 5,
                        created_at: '2026-09-06T10:00:00+02:00',
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('link', { name: /Léa Durand/ }),
        ).toHaveAttribute('href', '/tools/documents/3');
        expect(
            screen.getByText(/2 personne\(s\) · 5 pièce\(s\)/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Créer une liste de documents/ }),
        ).toHaveAttribute('href', '/tools/documents/create?lead=7');
    });

    it('shows an empty state', () => {
        render(<LeadDocumentRequests leadId={7} requests={[]} />);

        expect(
            screen.getByText('Aucune liste de documents pour ce lead.'),
        ).toBeInTheDocument();
    });
});
