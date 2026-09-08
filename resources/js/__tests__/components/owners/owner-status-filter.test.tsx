import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OwnerStatusFilter } from '@/components/owners/owner-status-filter';
import { ownerStatuses } from '@/test/fixtures/owner';

describe('OwnerStatusFilter', () => {
    it('opens a « Filtres » menu with one checkbox per status and its count, and adds a status', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <OwnerStatusFilter
                statuses={ownerStatuses}
                counts={{ to_contact: 6, contacted: 3 }}
                value={[]}
                onChange={onChange}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Réinitialiser' }),
        ).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Filtres' }));

        const toContact = await screen.findByRole('menuitemcheckbox', {
            name: /À contacter/,
        });
        expect(toContact).toHaveTextContent('6');
        expect(toContact).toHaveAttribute('aria-checked', 'false');
        expect(
            screen.getByRole('menuitemcheckbox', { name: /Mandat signé/ }),
        ).toHaveTextContent('0');

        await user.click(
            screen.getByRole('menuitemcheckbox', { name: /Contacté/ }),
        );
        expect(onChange).toHaveBeenCalledWith(['contacted']);
        // Le menu reste ouvert pour cocher un second statut.
        expect(
            screen.getByRole('menuitemcheckbox', { name: /À contacter/ }),
        ).toBeInTheDocument();
    });

    it('counts the active filters on the button, unchecks a status and resets', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <OwnerStatusFilter
                statuses={ownerStatuses}
                counts={{ interested: 2, mandate: 1 }}
                value={['interested', 'mandate']}
                onChange={onChange}
            />,
        );

        const trigger = screen.getByRole('button', { name: /Filtres/ });
        expect(trigger).toHaveTextContent('2');

        await user.click(trigger);
        const mandate = await screen.findByRole('menuitemcheckbox', {
            name: /Mandat signé/,
        });
        expect(mandate).toHaveAttribute('aria-checked', 'true');
        await user.click(mandate);
        expect(onChange).toHaveBeenCalledWith(['interested']);

        await user.keyboard('{Escape}');
        await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
        expect(onChange).toHaveBeenCalledWith([]);
    });
});
