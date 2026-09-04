import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const google = vi.hoisted(() => ({
    key: 'test-key',
    fetch: vi.fn(),
}));

vi.mock('@/lib/google-places', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/google-places')>();

    return {
        ...actual,
        googleMapsApiKey: () => google.key,
        fetchPlaceSuggestions: google.fetch,
    };
});

import { AddressAutocomplete } from '@/components/address-autocomplete';

// Le champ est contrôlé : on garde l'état comme le ferait le formulaire.
function Controlled({
    onChange,
    onSelect,
}: {
    onChange: (value: string) => void;
    onSelect: (address: unknown) => void;
}) {
    const [value, setValue] = useState('');

    return (
        <AddressAutocomplete
            value={value}
            onChange={(next) => {
                setValue(next);
                onChange(next);
            }}
            onSelect={onSelect}
        />
    );
}

const resolved = {
    street: '5 Rue des Alpes',
    postalCode: '1201',
    city: 'Genève',
    countryCode: 'CH',
    countryName: 'Suisse',
};

describe('AddressAutocomplete', () => {
    beforeEach(() => {
        google.key = 'test-key';
        google.fetch.mockReset();
    });

    it('is a plain input when no API key is configured', () => {
        google.key = '';
        render(
            <AddressAutocomplete
                value=""
                onChange={vi.fn()}
                onSelect={vi.fn()}
            />,
        );

        expect(
            screen.getByPlaceholderText('Rue et numéro'),
        ).not.toHaveAttribute('role');
    });

    it('suggests addresses after typing and fills the address on selection', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onSelect = vi.fn();
        google.fetch.mockResolvedValue([
            {
                id: 'p1',
                main: 'Rue des Alpes 5',
                secondary: '1201 Genève, Suisse',
                resolve: async () => resolved,
            },
        ]);

        render(<Controlled onChange={onChange} onSelect={onSelect} />);

        await user.type(screen.getByRole('combobox'), 'Rue des');

        const option = await screen.findByRole('option', {
            name: /Rue des Alpes 5/,
        });
        expect(google.fetch).toHaveBeenLastCalledWith(
            'Rue des',
            ['ch', 'fr'],
            expect.any(Object),
        );

        await user.click(option);

        await waitFor(() => expect(onSelect).toHaveBeenCalledWith(resolved));
        expect(onChange).toHaveBeenLastCalledWith('5 Rue des Alpes');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('supports keyboard navigation and Enter', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        google.fetch.mockResolvedValue([
            {
                id: 'a',
                main: 'A',
                secondary: '',
                resolve: async () => resolved,
            },
            {
                id: 'b',
                main: 'B',
                secondary: '',
                resolve: async () => ({ ...resolved, street: 'B' }),
            },
        ]);

        render(<Controlled onChange={vi.fn()} onSelect={onSelect} />);

        await user.type(screen.getByRole('combobox'), 'Rue');
        await screen.findByRole('option', { name: 'A' });
        await user.keyboard('{ArrowDown}{Enter}');

        await waitFor(() =>
            expect(onSelect).toHaveBeenCalledWith(
                expect.objectContaining({ street: 'B' }),
            ),
        );
    });
});
