import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/manage-two-factor', () => ({
    default: ({ twoFactorEnabled }: { twoFactorEnabled?: boolean }) => (
        <section aria-label="Authentification à deux facteurs">
            {twoFactorEnabled ? 'Activée' : 'Désactivée'}
        </section>
    ),
}));

vi.mock('@/components/manage-passkeys', () => ({
    default: () => <section aria-label="Clés d’accès (passkeys)" />,
}));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
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
}));

import Security from '@/pages/settings/security';

describe('Security settings page', () => {
    it('shows the password panel with the three fields', () => {
        render(
            <Security
                passwordRules="minlength: 8"
                canManageTwoFactor
                canManagePasskeys
                twoFactorEnabled
                passkeys={[]}
            />,
        );

        expect(
            screen.getByRole('region', { name: 'Mot de passe' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Mot de passe actuel')).toHaveAttribute(
            'autocomplete',
            'current-password',
        );
        expect(screen.getByLabelText('Nouveau mot de passe')).toHaveAttribute(
            'passwordrules',
            'minlength: 8',
        );
        expect(
            screen.getByLabelText('Confirmer le mot de passe'),
        ).toBeInTheDocument();
    });

    it('stacks password, two-factor and passkeys panels in this order', () => {
        render(
            <Security
                passwordRules=""
                canManageTwoFactor
                canManagePasskeys
                twoFactorEnabled
                passkeys={[]}
            />,
        );

        const names = screen
            .getAllByRole('region')
            .map((region) => region.getAttribute('aria-label'));

        expect(names).toEqual([
            'Mot de passe',
            'Authentification à deux facteurs',
            'Clés d’accès (passkeys)',
        ]);
        expect(
            screen.getByRole('region', {
                name: 'Authentification à deux facteurs',
            }),
        ).toHaveTextContent('Activée');
    });
});
