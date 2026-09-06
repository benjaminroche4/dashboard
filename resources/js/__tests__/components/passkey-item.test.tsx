import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PasskeyItem from '@/components/passkey-item';

const passkey = {
    id: 7,
    name: 'MacBook Pro',
    authenticator: 'Apple',
    created_at_diff: 'il y a 2 jours',
    last_used_at_diff: 'il y a 1 heure',
};

describe('PasskeyItem', () => {
    it('shows the name, authenticator and French dates', () => {
        render(
            <ul>
                <PasskeyItem passkey={passkey} onDelete={vi.fn()} />
            </ul>,
        );

        expect(screen.getByRole('listitem')).toHaveTextContent('MacBook Pro');
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Ajoutée il y a 2 jours · Dernière utilisation il y a 1 heure',
            ),
        ).toBeInTheDocument();
    });

    it('confirms in a dialog then calls onDelete with the id', async () => {
        const onDelete = vi.fn();
        render(
            <ul>
                <PasskeyItem passkey={passkey} onDelete={onDelete} />
            </ul>,
        );

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Supprimer la clé d’accès MacBook Pro',
            }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Supprimer la clé d’accès' }),
        );

        expect(onDelete).toHaveBeenCalledWith(7, expect.any(Function));
        expect(
            screen.getByRole('button', { name: 'Suppression…' }),
        ).toBeDisabled();
    });
});
