import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const google = vi.hoisted(() => ({
    key: 'test-key',
    fetch: vi.fn(),
    fetchFields: vi.fn(),
}));

vi.mock('@/lib/google-places', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/google-places')>();

    return {
        ...actual,
        googleMapsApiKey: () => google.key,
        loadGooglePlaces: async () => ({
            AutocompleteSessionToken: class {},
            AutocompleteSuggestion: {
                fetchAutocompleteSuggestions: google.fetch,
            },
        }),
    };
});

import { AddressAutocomplete } from '@/components/address-autocomplete';
import { useState } from 'react';

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

function suggestion(
    id: string,
    main: string,
    secondary: string,
    components: unknown[],
) {
    return {
        placePrediction: {
            placeId: id,
            text: { text: `${main}, ${secondary}` },
            mainText: { text: main },
            secondaryText: { text: secondary },
            toPlace: () => ({
                fetchFields: google.fetchFields,
                addressComponents: components,
            }),
        },
    };
}

describe('AddressAutocomplete', () => {
    beforeEach(() => {
        google.key = 'test-key';
        google.fetch.mockReset();
        google.fetchFields.mockReset().mockResolvedValue(undefined);
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
        google.fetch.mockResolvedValue({
            suggestions: [
                suggestion('p1', 'Rue des Alpes 5', '1201 Genève, Suisse', [
                    { types: ['street_number'], longText: '5', shortText: '5' },
                    {
                        types: ['route'],
                        longText: 'Rue des Alpes',
                        shortText: 'Rue des Alpes',
                    },
                    {
                        types: ['postal_code'],
                        longText: '1201',
                        shortText: '1201',
                    },
                    {
                        types: ['locality'],
                        longText: 'Genève',
                        shortText: 'Genève',
                    },
                    { types: ['country'], longText: 'Suisse', shortText: 'CH' },
                ]),
            ],
        });

        render(<Controlled onChange={onChange} onSelect={onSelect} />);

        await user.type(screen.getByRole('combobox'), 'Rue des');

        const option = await screen.findByRole('option', {
            name: /Rue des Alpes 5/,
        });
        expect(google.fetch).toHaveBeenCalledWith(
            expect.objectContaining({
                input: 'Rue des',
                language: 'fr',
                includedRegionCodes: ['ch', 'fr'],
            }),
        );

        await user.click(option);

        await waitFor(() =>
            expect(onSelect).toHaveBeenCalledWith({
                street: '5 Rue des Alpes',
                postalCode: '1201',
                city: 'Genève',
                countryCode: 'CH',
                countryName: 'Suisse',
            }),
        );
        expect(onChange).toHaveBeenLastCalledWith('5 Rue des Alpes');
    });
});
