import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PropertyPicker } from '@/components/visits/property-picker';

const properties = [
    {
        id: 1,
        label: 'T2 lumineux · 11e',
        street: '12 rue Oberkampf',
        postal_code: '75011',
        city: 'Paris',
        photo: '/storage/properties/salon.jpg',
    },
    {
        id: 2,
        label: '3 rue des Martyrs',
        street: '3 rue des Martyrs',
        postal_code: '75009',
        city: 'Paris',
        photo: null,
    },
];

describe('PropertyPicker', () => {
    it('switches between the directory and a new property with two radio cards', async () => {
        const user = userEvent.setup();
        const onSourceChange = vi.fn();
        render(
            <PropertyPicker
                source="existing"
                onSourceChange={onSourceChange}
                properties={properties}
                propertyId=""
                onPropertyChange={vi.fn()}
            />,
        );

        const group = within(
            screen.getByRole('radiogroup', { name: 'Bien à visiter' }),
        );
        expect(
            group.getByRole('radio', { name: 'Un bien de l’annuaire' }),
        ).toBeChecked();
        expect(
            group.getByRole('radio', { name: 'Nouveau bien' }),
        ).not.toBeChecked();
        await user.click(group.getByRole('radio', { name: 'Nouveau bien' }));
        expect(onSourceChange).toHaveBeenCalledWith('new');
    });

    it('lists the properties with their main photo, searchable by address', async () => {
        const user = userEvent.setup();
        const onPropertyChange = vi.fn();
        render(
            <PropertyPicker
                source="existing"
                onSourceChange={vi.fn()}
                properties={properties}
                propertyId="1"
                onPropertyChange={onPropertyChange}
            />,
        );

        const trigger = screen.getByRole('combobox');
        expect(trigger).toHaveTextContent('T2 lumineux · 11e');
        expect(
            within(trigger).getByAltText('Photo de T2 lumineux · 11e'),
        ).toHaveAttribute('src', '/storage/properties/salon.jpg');

        await user.click(trigger);
        const options = await screen.findAllByRole('option');
        expect(options).toHaveLength(2);
        expect(
            within(options[0] as HTMLElement).getByAltText(
                'Photo de T2 lumineux · 11e',
            ),
        ).toBeInTheDocument();
        expect(
            within(options[1] as HTMLElement).queryByRole('img'),
        ).not.toBeInTheDocument();

        await user.type(
            screen.getByPlaceholderText(/Rechercher un bien/),
            'martyrs',
        );
        expect(screen.getAllByRole('option')).toHaveLength(1);
        await user.click(screen.getByRole('option', { name: /Martyrs/ }));
        expect(onPropertyChange).toHaveBeenCalledWith('2');
    });

    it('disables the directory card when it is empty', () => {
        render(
            <PropertyPicker
                source="new"
                onSourceChange={vi.fn()}
                properties={[]}
                propertyId=""
                onPropertyChange={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('radio', { name: 'Un bien de l’annuaire' }),
        ).toBeDisabled();
        expect(screen.getByText('L’annuaire est vide')).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
});
