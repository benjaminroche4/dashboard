import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    router: { delete: vi.fn(), reload: vi.fn() },
}));

vi.mock('@/components/passkey-register', () => ({
    default: () => <button type="button">Ajouter une clé d’accès</button>,
}));

import ManagePasskeys from '@/components/manage-passkeys';

const passkeys = [
    {
        id: 1,
        name: 'MacBook Pro',
        authenticator: null,
        created_at_diff: 'il y a 2 jours',
        last_used_at_diff: null,
    },
    {
        id: 2,
        name: 'iPhone',
        authenticator: null,
        created_at_diff: 'hier',
        last_used_at_diff: null,
    },
];

describe('ManagePasskeys', () => {
    it('renders nothing when passkeys are disabled', () => {
        const { container } = render(
            <ManagePasskeys canManagePasskeys={false} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('lists the passkeys in a panel with a counter badge', () => {
        render(<ManagePasskeys canManagePasskeys passkeys={passkeys} />);

        const panel = screen.getByRole('region', {
            name: 'Clés d’accès (passkeys)',
        });

        expect(panel).toHaveClass('bg-sidebar');
        expect(panel).toHaveTextContent('2 clés');
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(
            screen.getByRole('button', { name: 'Ajouter une clé d’accès' }),
        ).toBeInTheDocument();
    });

    it('shows an empty state without a badge', () => {
        render(<ManagePasskeys canManagePasskeys passkeys={[]} />);

        expect(screen.getByText('Aucune clé d’accès')).toBeInTheDocument();
        expect(screen.queryByText(/clé$/)).not.toBeInTheDocument();
    });
});
