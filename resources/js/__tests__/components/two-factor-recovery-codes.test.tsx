import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
    }: {
        children: (state: { processing: boolean }) => React.ReactNode;
    }) => <form>{children({ processing: false })}</form>,
}));

import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';

describe('TwoFactorRecoveryCodes', () => {
    it('fetches the codes on mount and reveals them on click', async () => {
        const fetchRecoveryCodes = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(
            <TwoFactorRecoveryCodes
                recoveryCodesList={[]}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        expect(fetchRecoveryCodes).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole('region', { name: 'Codes de récupération' }),
        ).toHaveClass('bg-background', 'rounded-lg', 'border');

        rerender(
            <TwoFactorRecoveryCodes
                recoveryCodesList={['aaaa-1111', 'bbbb-2222']}
                fetchRecoveryCodes={fetchRecoveryCodes}
                errors={[]}
            />,
        );

        const toggle = screen.getByRole('button', {
            name: 'Afficher les codes',
        });

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.queryByRole('button', { name: /Régénérer/ }),
        ).not.toBeInTheDocument();

        await userEvent.click(toggle);

        expect(
            screen.getByRole('button', { name: 'Masquer les codes' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('aaaa-1111')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Régénérer les codes' }),
        ).toBeInTheDocument();
    });
});
