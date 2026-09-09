import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterMenu } from '@/components/filter-menu';

const options = [
    { value: 'available' as const, label: 'Disponible' },
    { value: 'rented' as const, label: 'Loué' },
    { value: 'unavailable' as const, label: 'Non disponible' },
];

describe('FilterMenu', () => {
    it('lists the options with their counts, keeps the menu open and reports each choice', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <FilterMenu
                title="Disponibilité"
                options={options}
                counts={{ available: 7, rented: 2 }}
                value={[]}
                onChange={onChange}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Réinitialiser' }),
        ).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Filtres' }));

        expect(
            await screen.findByRole('menuitemcheckbox', { name: /Disponible/ }),
        ).toHaveTextContent('7');
        expect(
            screen.getByRole('menuitemcheckbox', { name: /Non disponible/ }),
        ).toHaveTextContent('0');

        await user.click(
            screen.getByRole('menuitemcheckbox', { name: /^Loué/ }),
        );
        expect(onChange).toHaveBeenCalledWith(['rented']);
        // Le menu reste ouvert pour cocher un second choix.
        expect(
            screen.getByRole('menuitemcheckbox', { name: /Disponible/ }),
        ).toBeInTheDocument();
    });

    it('counts the active filters on the button, unchecks one and resets', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <FilterMenu
                title="Disponibilité"
                options={options}
                counts={{ available: 1, rented: 1 }}
                value={['available', 'rented']}
                onChange={onChange}
            />,
        );

        const trigger = screen.getByRole('button', { name: /Filtres/ });
        expect(trigger).toHaveTextContent('2');

        await user.click(trigger);
        const available = await screen.findByRole('menuitemcheckbox', {
            name: /Disponible/,
        });
        expect(available).toHaveAttribute('aria-checked', 'true');
        await user.click(available);
        expect(onChange).toHaveBeenCalledWith(['rented']);

        await user.keyboard('{Escape}');
        await user.click(screen.getByRole('button', { name: 'Réinitialiser' }));
        expect(onChange).toHaveBeenCalledWith([]);
    });
});
