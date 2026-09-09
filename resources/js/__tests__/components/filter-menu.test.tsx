import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PartnerTypeFilter } from '@/components/partners/partner-type-filter';
import { partnerTypes } from '@/test/fixtures/partner';

describe('PartnerTypeFilter', () => {
    it('opens a « Filtres » menu with one checkbox per type and its count, and adds a type', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <PartnerTypeFilter
                types={partnerTypes}
                counts={{ management: 3, insurance: 1 }}
                value={[]}
                onChange={onChange}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Réinitialiser' }),
        ).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Filtres' }));

        const management = await screen.findByRole('menuitemcheckbox', {
            name: /Gestion/,
        });
        expect(management).toHaveTextContent('3');
        expect(management).toHaveAttribute('aria-checked', 'false');
        expect(
            screen.getByRole('menuitemcheckbox', { name: /Banque/ }),
        ).toHaveTextContent('0');

        await user.click(
            screen.getByRole('menuitemcheckbox', { name: /Assurance/ }),
        );
        expect(onChange).toHaveBeenCalledWith(['insurance']);
        // Le menu reste ouvert pour cocher un second type.
        expect(
            screen.getByRole('menuitemcheckbox', { name: /Gestion/ }),
        ).toBeInTheDocument();
    });

    it('counts the active filters on the button, unchecks a type and resets', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <PartnerTypeFilter
                types={partnerTypes}
                counts={{ bank: 2, management: 1 }}
                value={['bank', 'management']}
                onChange={onChange}
            />,
        );

        const trigger = screen.getByRole('button', { name: /Filtres/ });
        expect(trigger).toHaveTextContent('2');

        await user.click(trigger);
        const bank = await screen.findByRole('menuitemcheckbox', {
            name: /Banque/,
        });
        expect(bank).toHaveAttribute('aria-checked', 'true');
        await user.click(bank);
        expect(onChange).toHaveBeenCalledWith(['management']);

        await user.keyboard('{Escape}');
        await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
        expect(onChange).toHaveBeenCalledWith([]);
    });
});
