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
});
