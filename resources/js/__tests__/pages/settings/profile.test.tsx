import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { makeUser } from '@/test/fixtures/user';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Form: ({
        children,
        className,
    }: {
        children: (state: {
            processing: boolean;
            errors: Record<string, string>;
        }) => React.ReactNode;
        className?: string;
    }) => (
        <form className={className}>
            {children({ processing: false, errors: {} })}
        </form>
    ),
    usePage: () => ({
        props: {
            auth: {
                user: makeUser({ phone: '+33 6 12 34 56 78' }),
                can: { manageStaff: true, viewPulse: true },
            },
            errors: {},
        },
    }),
    router: { post: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/components/delete-user', () => ({
    default: () => <div data-testid="delete-user" />,
}));

import Profile from '@/pages/settings/profile';

describe('Profile settings page', () => {
    it('renders the photo panel above the profile form', () => {
        render(<Profile />);

        expect(
            screen.getByRole('region', { name: 'Photo de profil' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Ajouter une photo' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Nom')).toHaveValue('Admin');
        expect(screen.getByLabelText('Adresse e-mail')).toHaveValue(
            'admin@admin.fr',
        );
    });

    it('offers a phone field for SMS alerts, prefilled and sent as one international number', () => {
        const { container } = render(<Profile />);

        expect(
            screen.getByLabelText('Téléphone (pour les alertes par SMS)'),
        ).toHaveValue('6 12 34 56 78');
        expect(
            screen.getByRole('combobox', { name: 'Indicatif' }),
        ).toHaveTextContent('+33');
        expect(
            container.querySelector('input[type="hidden"][name="phone"]'),
        ).toHaveValue('+33 6 12 34 56 78');
    });
});
