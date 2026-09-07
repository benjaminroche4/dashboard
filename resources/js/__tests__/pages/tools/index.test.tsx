import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
}));

import ToolsIndex from '@/pages/tools/index';

describe('Tools page', () => {
    it('shows the document list card with its links', () => {
        render(<ToolsIndex />);

        expect(
            screen.getByRole('heading', { name: 'Outils' }),
        ).toBeInTheDocument();
        const card = screen.getByRole('region', {
            name: 'Liste de documents',
        });
        expect(card).toHaveTextContent(/par personne du foyer/);
        expect(
            screen.getByRole('link', { name: 'Voir les demandes' }),
        ).toHaveAttribute('href', '/tools/documents');
        expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    it('shows the quotes card linking to the quotes list', () => {
        render(<ToolsIndex />);

        const card = screen.getByRole('region', { name: 'Devis' });
        expect(card).toHaveTextContent(/facture créée d'un clic/);
        expect(
            screen.getByRole('link', { name: 'Voir les devis' }),
        ).toHaveAttribute('href', '/tools/quotes');
    });

    it('shows the invoices card linking to the invoices list', () => {
        render(<ToolsIndex />);

        expect(
            screen.getByRole('region', { name: 'Factures' }),
        ).toHaveTextContent(/retards détectés/);
        expect(
            screen.getByRole('link', { name: 'Voir les factures' }),
        ).toHaveAttribute('href', '/invoices');
    });

    it('does not list the reports among the tools', () => {
        render(<ToolsIndex />);

        expect(screen.queryByRole('region', { name: 'Rapports' })).toBeNull();
        expect(
            screen.queryByRole('link', { name: 'Voir les rapports' }),
        ).toBeNull();
    });

    it('declares a breadcrumb to the tools page', () => {
        expect(ToolsIndex.layout.breadcrumbs[0]?.title).toBe('Outils');
        expect(ToolsIndex.layout.breadcrumbs[0]?.href.url).toBe('/tools');
    });
});
