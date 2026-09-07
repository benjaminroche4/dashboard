import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddressFields } from '@/components/real-estate/address-fields';

const { enabled } = vi.hoisted(() => ({ enabled: { value: false } }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            features: {
                addressAutocomplete: enabled.value,
                googleMapsKey: null,
            },
        },
    }),
}));

const resolved = {
    street: '12 rue de Turenne',
    postalCode: '75003',
    city: 'Paris',
    countryCode: 'FR',
    countryName: 'France',
};

vi.mock('@/components/address-autocomplete', () => ({
    AddressAutocomplete: ({
        id,
        value,
        onChange,
        onSelect,
        enabled: isEnabled,
    }: {
        id: string;
        value: string;
        onChange: (value: string) => void;
        onSelect: (address: typeof resolved) => void;
        enabled: boolean;
    }) => (
        <>
            <input
                id={id}
                value={value}
                data-enabled={isEnabled}
                onChange={(event) => onChange(event.target.value)}
            />
            <button type="button" onClick={() => onSelect(resolved)}>
                Choisir la suggestion
            </button>
        </>
    ),
}));

describe('AddressFields', () => {
    it('fills the three fields from a chosen suggestion and edits them one by one', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <AddressFields
                idPrefix="agency"
                values={{ street: '', postal_code: '', city: '' }}
                errors={{ city: 'Ville trop longue.' }}
                onChange={onChange}
            />,
        );

        expect(screen.getByLabelText('Adresse')).toHaveAttribute(
            'data-enabled',
            'false',
        );
        expect(screen.getByText('Ville trop longue.')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Choisir la suggestion' }),
        );
        expect(onChange).toHaveBeenLastCalledWith({
            street: '12 rue de Turenne',
            postal_code: '75003',
            city: 'Paris',
        });

        await user.type(screen.getByLabelText('Code postal'), '7');
        expect(onChange).toHaveBeenLastCalledWith({
            street: '',
            postal_code: '7',
            city: '',
        });
    });

    it('passes the Google feature flag through', () => {
        enabled.value = true;
        render(
            <AddressFields
                idPrefix="agent"
                values={{ street: '', postal_code: '', city: '' }}
                errors={{}}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Adresse')).toHaveAttribute(
            'data-enabled',
            'true',
        );
    });
});
