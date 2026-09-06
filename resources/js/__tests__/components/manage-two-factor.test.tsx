import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
    }: {
        children: (state: { processing: boolean }) => React.ReactNode;
    }) => <form>{children({ processing: false })}</form>,
}));

vi.mock('@/hooks/use-two-factor-auth', () => ({
    useTwoFactorAuth: () => ({
        qrCodeSvg: null,
        manualSetupKey: null,
        recoveryCodesList: [],
        hasSetupData: false,
        errors: [],
        clearSetupData: vi.fn(),
        clearTwoFactorAuthData: vi.fn(),
        fetchSetupData: vi.fn(),
        fetchRecoveryCodes: vi.fn(),
    }),
}));

vi.mock('@/components/two-factor-setup-modal', () => ({ default: () => null }));
vi.mock('@/components/two-factor-recovery-codes', () => ({
    default: () => <section aria-label="Codes de récupération" />,
}));

import ManageTwoFactor from '@/components/manage-two-factor';

describe('ManageTwoFactor', () => {
    it('renders nothing when two-factor is not available', () => {
        const { container } = render(
            <ManageTwoFactor canManageTwoFactor={false} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('offers to enable 2FA with a "Désactivée" badge', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled={false} />);

        const panel = screen.getByRole('region', {
            name: 'Authentification à deux facteurs',
        });

        expect(panel).toHaveTextContent('Désactivée');
        expect(
            screen.getByRole('button', { name: 'Activer la 2FA' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Codes de récupération' }),
        ).not.toBeInTheDocument();
    });

    it('shows the "Activée" badge, the disable button and recovery codes', () => {
        render(<ManageTwoFactor canManageTwoFactor twoFactorEnabled />);

        expect(screen.getByText('Activée')).toHaveClass('bg-emerald-50');
        expect(
            screen.getByRole('button', { name: 'Désactiver la 2FA' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Codes de récupération' }),
        ).toBeInTheDocument();
    });
});
