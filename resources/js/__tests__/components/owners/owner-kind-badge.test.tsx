import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    OwnerKindBadge,
    ownerKindTones,
} from '@/components/owners/owner-kind-badge';

describe('OwnerKindBadge', () => {
    it('tints each kind differently, so both are told apart at a glance', () => {
        expect(ownerKindTones.individual).not.toBe(ownerKindTones.company);

        for (const tone of Object.values(ownerKindTones)) {
            expect(tone).toMatch(/dark:/);
        }
    });

    it('shows the label with the tint of its kind', () => {
        const { rerender } = render(
            <OwnerKindBadge kind="individual" label="Particulier" />,
        );
        const individual = screen.getByText('Particulier');
        expect(individual.className).toContain('sky');

        rerender(<OwnerKindBadge kind="company" label="Société ou agence" />);
        expect(screen.getByText('Société ou agence').className).toContain(
            'violet',
        );
    });
});
