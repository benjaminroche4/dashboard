import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Form: ({
        children,
        className,
    }: {
        children: (state: {
            processing: boolean;
            errors: Record<string, string>;
            resetAndClearErrors: () => void;
        }) => React.ReactNode;
        className?: string;
    }) => (
        <form className={className}>
            {children({
                processing: false,
                errors: {},
                resetAndClearErrors: () => {},
            })}
        </form>
    ),
}));

import DeleteUser from '@/components/delete-user';

describe('DeleteUser', () => {
    it('shows a destructive panel with the warning and the trigger', () => {
        render(<DeleteUser />);

        const panel = screen.getByRole('region', {
            name: 'Supprimer le compte',
        });

        expect(panel).toHaveClass('border-red-200');
        expect(panel).toHaveTextContent('Cette action est irréversible.');
        expect(
            screen.getByRole('button', { name: 'Supprimer le compte' }),
        ).toBeInTheDocument();
    });

    it('asks for the password in a dialog before deleting', async () => {
        render(<DeleteUser />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Supprimer le compte' }),
        );

        const dialog = screen.getByRole('dialog');

        expect(dialog).toHaveTextContent(
            'Voulez-vous vraiment supprimer votre compte ?',
        );
        expect(screen.getByLabelText('Mot de passe')).toHaveAttribute(
            'type',
            'password',
        );
        expect(
            screen.getByRole('button', { name: 'Annuler' }),
        ).toBeInTheDocument();
    });
});
