import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineField, normalize } from '@/components/inline-field';

describe('InlineField', () => {
    it('shows the value as a button, edits a text on click, saves with Enter and cancels with Escape', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Ville d'origine"
                display="Lyon"
                edit={{ kind: 'text', value: 'Lyon' }}
                onSave={onSave}
            />,
        );

        const button = screen.getByRole('button', {
            name: "Modifier Ville d'origine",
        });
        expect(button).toHaveTextContent('Lyon');
        await user.click(button);

        const input = screen.getByRole('textbox', { name: "Ville d'origine" });
        expect(input).toHaveValue('Lyon');
        await user.clear(input);
        await user.type(input, 'Genève{Enter}');
        expect(onSave).toHaveBeenCalledWith('Genève');

        // Échap ferme sans enregistrer ; un texte vidé part à null.
        onSave.mockReset();
        await user.keyboard('{Escape}');
        expect(
            screen.getByRole('button', { name: "Modifier Ville d'origine" }),
        ).toBeInTheDocument();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('saves a select as soon as a choice is made, with null for « Non renseigné »', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Offre visée"
                display="Accompagné"
                edit={{
                    kind: 'select',
                    value: 'accompagne',
                    options: [
                        { value: 'accompagne', label: 'Accompagné' },
                        { value: 'confie', label: 'Confié' },
                    ],
                }}
                onSave={onSave}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Offre visée' }),
        );
        await user.click(screen.getByRole('combobox', { name: 'Offre visée' }));
        await user.click(await screen.findByRole('option', { name: 'Confié' }));
        expect(onSave).toHaveBeenCalledWith('confie');
    });

    it('searches a long list and saves on choice, the empty entry clearing the value', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Agence"
                display="Agence du Marais"
                edit={{
                    kind: 'search',
                    value: '1',
                    options: [
                        {
                            value: '1',
                            label: 'Agence du Marais',
                            hint: 'Paris 3e',
                        },
                        { value: '2', label: 'Century 21 Bastille' },
                    ],
                    emptyLabel: 'Indépendant',
                    searchPlaceholder: 'Rechercher une agence…',
                }}
                onSave={onSave}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Agence' }),
        );
        await user.click(screen.getByRole('combobox', { name: 'Agence' }));
        await user.type(
            screen.getByPlaceholderText('Rechercher une agence…'),
            'bast',
        );
        const matches = screen.getAllByRole('option');
        expect(matches).toHaveLength(1);
        await user.click(matches[0] as HTMLElement);
        expect(onSave).toHaveBeenCalledWith('2');

        onSave.mockReset();
        await user.click(screen.getByRole('combobox', { name: 'Agence' }));
        await user.click(
            await screen.findByRole('option', { name: /Indépendant/ }),
        );
        expect(onSave).toHaveBeenCalledWith(null);
    });

    it('closes once the save completes and keeps the control while saving', () => {
        const { rerender } = render(
            <InlineField
                label="Budget mensuel"
                display="2 500 €"
                edit={{ kind: 'money', value: 250_000, suffix: '€ / mois' }}
                onSave={vi.fn()}
                open
                saving
            />,
        );

        const input = screen.getByRole('spinbutton', {
            name: 'Budget mensuel',
        });
        expect(input).toHaveValue(2500);
        expect(
            screen.getByRole('button', { name: 'Enregistrer' }),
        ).toBeDisabled();

        rerender(
            <InlineField
                label="Budget mensuel"
                display="2 500 €"
                edit={{ kind: 'money', value: 250_000, suffix: '€ / mois' }}
                onSave={vi.fn()}
                saving={false}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Modifier Budget mensuel' }),
        ).toBeInTheDocument();
    });

    it('normalizes what goes to the server: cents, sorted districts, null for blanks', () => {
        expect(normalize({ kind: 'money', value: null }, 2600)).toBe(260_000);
        expect(normalize({ kind: 'money', value: null }, null)).toBeNull();
        expect(normalize({ kind: 'number', value: null }, '42')).toBe(42);
        expect(normalize({ kind: 'number', value: null }, null)).toBeNull();
        expect(
            normalize(
                { kind: 'address', value: null, placeId: null, enabled: true },
                { address: '  ', placeId: 'x' },
            ),
        ).toEqual({ address: null, place_id: null });
        expect(normalize({ kind: 'districts', value: [] }, ['9', '3'])).toEqual(
            [3, 9],
        );
        expect(normalize({ kind: 'text', value: null }, '   ')).toBeNull();
        expect(normalize({ kind: 'date', value: null }, '')).toBeNull();
        expect(
            normalize({ kind: 'multi', value: [], options: [] }, ['t2']),
        ).toEqual(['t2']);
    });
});

vi.mock('@/components/address-autocomplete', () => ({
    AddressAutocomplete: ({
        value,
        onChange,
        onSelect,
        kind,
    }: {
        value: string;
        onChange: (value: string) => void;
        onSelect: (address: {
            street: string;
            postalCode: string;
            city: string;
            countryCode: string | null;
            countryName: string;
            placeId?: string | null;
        }) => void;
        kind?: string;
    }) => (
        <div>
            <input
                aria-label="Ville"
                data-kind={kind}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <button
                type="button"
                onClick={() =>
                    onSelect({
                        street: '',
                        postalCode: '',
                        city: 'Genève',
                        countryCode: 'CH',
                        countryName: 'Suisse',
                    })
                }
            >
                Choisir Genève
            </button>
            <button
                type="button"
                onClick={() =>
                    onSelect({
                        street: '12 rue de Rivoli',
                        postalCode: '75004',
                        city: 'Paris',
                        countryCode: 'FR',
                        countryName: 'France',
                        placeId: 'ChIJ-rivoli',
                    })
                }
            >
                Choisir Rivoli
            </button>
        </div>
    ),
}));

describe('InlineField city', () => {
    it('searches the city in Google Places and saves it with its country, or without country when typed by hand', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Ville d'origine"
                display="Lyon"
                edit={{
                    kind: 'city',
                    value: 'Lyon',
                    country: 'FR',
                    enabled: true,
                }}
                onSave={onSave}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: "Modifier Ville d'origine" }),
        );
        expect(screen.getByRole('textbox', { name: 'Ville' })).toHaveAttribute(
            'data-kind',
            'cities',
        );
        await user.click(
            screen.getByRole('button', { name: 'Choisir Genève' }),
        );
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(onSave).toHaveBeenCalledWith({
            origin_city: 'Genève',
            origin_country: 'CH',
        });

        // Tapée à la main, la ville part sans pays : on n'invente pas un drapeau.
        onSave.mockReset();
        await user.clear(screen.getByRole('textbox', { name: 'Ville' }));
        await user.type(screen.getByRole('textbox', { name: 'Ville' }), 'Bâle');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(onSave).toHaveBeenCalledWith({
            origin_city: 'Bâle',
            origin_country: null,
        });
    });

    it('stays open with the reason when the server refuses, instead of closing silently', () => {
        const { rerender } = render(
            <InlineField
                label="Notes libres"
                display="Ancienne note"
                edit={{ kind: 'textarea', value: 'Ancienne note' }}
                open
                saving
                onSave={() => undefined}
            />,
        );

        rerender(
            <InlineField
                label="Notes libres"
                display="Ancienne note"
                edit={{ kind: 'textarea', value: 'Ancienne note' }}
                open
                saving={false}
                error="Le texte ne peut pas dépasser 20 000 caractères."
                onSave={() => undefined}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'ne peut pas dépasser 20 000 caractères',
        );
        expect(
            screen.getByRole('textbox', { name: 'Notes libres' }),
        ).toBeInTheDocument();
    });
});

describe('InlineField address and number', () => {
    it('searches the address in Google Places and saves it with its place, or without place when typed by hand', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Adresse"
                display="1 rue A"
                edit={{
                    kind: 'address',
                    value: '1 rue A',
                    placeId: 'ChIJ-a',
                    enabled: true,
                }}
                onSave={onSave}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Adresse' }),
        );
        expect(screen.getByRole('textbox', { name: 'Ville' })).toHaveAttribute(
            'data-kind',
            'address',
        );
        await user.click(
            screen.getByRole('button', { name: 'Choisir Rivoli' }),
        );
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(onSave).toHaveBeenCalledWith({
            address: '12 rue de Rivoli, 75004 Paris',
            place_id: 'ChIJ-rivoli',
        });

        // Tapée à la main, l'adresse part sans lieu : l'ancien ne vaut plus.
        onSave.mockReset();
        await user.clear(screen.getByRole('textbox', { name: 'Ville' }));
        await user.type(
            screen.getByRole('textbox', { name: 'Ville' }),
            '3 rue C',
        );
        await user.keyboard('{Enter}');
        expect(onSave).toHaveBeenCalledWith({
            address: '3 rue C',
            place_id: null,
        });
    });

    it('fills street, postal code and city from one Google Places suggestion, and clears all three without a street', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Adresse"
                display="1 rue A, 75001 Paris"
                edit={{
                    kind: 'postal_address',
                    street: '1 rue A',
                    postalCode: '75001',
                    city: 'Paris',
                    enabled: true,
                }}
                onSave={onSave}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Adresse' }),
        );
        expect(screen.getByRole('textbox', { name: 'Ville' })).toHaveValue(
            '1 rue A',
        );
        expect(screen.getByTestId('postal-address-rest')).toHaveTextContent(
            '75001 Paris',
        );
        await user.click(
            screen.getByRole('button', { name: 'Choisir Rivoli' }),
        );
        expect(screen.getByTestId('postal-address-rest')).toHaveTextContent(
            '75004 Paris',
        );
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(onSave).toHaveBeenCalledWith({
            street: '12 rue de Rivoli',
            postal_code: '75004',
            city: 'Paris',
        });

        // Vidée, l'adresse est effacée en entier.
        onSave.mockReset();
        await user.clear(screen.getByRole('textbox', { name: 'Ville' }));
        await user.keyboard('{Enter}');
        expect(onSave).toHaveBeenCalledWith({
            street: null,
            postal_code: null,
            city: null,
        });
    });

    it('edits an integer with its unit and bounds', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <InlineField
                label="Surface"
                display="42 m²"
                edit={{ kind: 'number', value: 42, suffix: 'm²', min: 0 }}
                onSave={onSave}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Surface' }),
        );
        const input = screen.getByRole('spinbutton', { name: 'Surface' });
        expect(input).toHaveValue(42);
        expect(input).toHaveAttribute('min', '0');
        expect(screen.getByText('m²')).toBeInTheDocument();
        await user.clear(input);
        await user.type(input, '55{Enter}');
        expect(onSave).toHaveBeenCalledWith(55);
    });
});
