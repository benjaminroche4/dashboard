import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchSelect } from '@/components/search-select';

const options = [
    { value: '1', label: 'Léa Durand', hint: 'LD-4821' },
    { value: '2', label: 'Paul Roux', hint: 'LD-4822', keywords: ['Nestlé'] },
];

describe('SearchSelect', () => {
    it('filters the options as the user types, on label, hint and keywords, then selects', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SearchSelect
                id="client"
                value=""
                onChange={onChange}
                options={options}
                placeholder="Choisir un client"
                searchPlaceholder="Rechercher…"
            />,
        );

        const trigger = screen.getByRole('combobox');
        expect(trigger).toHaveTextContent('Choisir un client');
        await user.click(trigger);
        expect(await screen.findAllByRole('option')).toHaveLength(2);

        await user.type(screen.getByPlaceholderText('Rechercher…'), 'nestl');
        const matches = screen.getAllByRole('option');
        expect(matches).toHaveLength(1);
        expect(matches[0]).toHaveTextContent('Paul Roux');

        await user.click(matches[0] as HTMLElement);
        expect(onChange).toHaveBeenCalledWith('2');
    });

    it('shows the selected option with its hint and offers an empty entry when asked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SearchSelect
                value="1"
                onChange={onChange}
                options={options}
                emptyLabel="Personne pour l’instant"
            />,
        );

        expect(screen.getByRole('combobox')).toHaveTextContent('Léa Durand');
        expect(screen.getByRole('combobox')).toHaveTextContent('LD-4821');
        await user.click(screen.getByRole('combobox'));
        await user.click(
            await screen.findByRole('option', {
                name: /Personne pour l’instant/,
            }),
        );
        expect(onChange).toHaveBeenCalledWith('');
    });
});
