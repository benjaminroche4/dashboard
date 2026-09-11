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
                leadUuid="0199a9a0-0000-7000-8000-000000000007"
                requests={[
                    {
                        id: 3,
                        uuid: '0199b0c0-0000-7000-8000-000000000003',
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
        ).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000003',
        );
        expect(
            screen.getByText(/2 personne\(s\) · 5 pièce\(s\)/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Créer une liste de pièces/ }),
        ).toHaveAttribute(
            'href',
            '/tools/documents/create?lead=0199a9a0-0000-7000-8000-000000000007',
        );
    });

    it('shows an empty state', () => {
        render(
            <LeadDocumentRequests
                leadUuid="0199a9a0-0000-7000-8000-000000000007"
                requests={[]}
            />,
        );

        expect(
            screen.getByText('Aucune liste de pièces pour ce lead.'),
        ).toBeInTheDocument();
    });
});
