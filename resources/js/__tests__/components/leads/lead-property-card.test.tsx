import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Le bouton « Voir sur la carte » lit la clé Google dans les props de page.
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { features: { googleMapsKey: null } } }),
}));
// Sans clé, le champ d'adresse est un simple texte : on le simule.
vi.mock('@/components/address-autocomplete', () => ({
    AddressAutocomplete: ({
        value,
        onChange,
    }: {
        value: string;
        onChange: (value: string) => void;
    }) => (
        <input
            aria-label="Adresse"
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
}));

import {
    LeadPropertyCard,
    describeFloor,
} from '@/components/leads/lead-property-card';
import {
    makeLeadPropertyDetail,
    makeLeadPropertyOptions,
} from '@/test/fixtures/lead';

const emptyProperty = makeLeadPropertyDetail({
    address: null,
    latitude: null,
    longitude: null,
    property_type: null,
    property_type_label: null,
    property_status: null,
    property_status_label: null,
    bedrooms: null,
    bathrooms: null,
    surface: null,
    floor: null,
    building_floors: null,
    furnishing: null,
    furnishing_label: null,
    orientations: [],
    orientation_labels: [],
    lease_types: [],
    lease_type_labels: [],
    rent_cents: null,
    charges_cents: null,
    deposit_cents: null,
    amenities: [],
    amenity_labels: [],
    note: null,
});

describe('describeFloor', () => {
    it('reads the floor the French way', () => {
        expect(describeFloor(3, 6)).toBe('3e sur 6');
        expect(describeFloor(1, null)).toBe('1er');
        expect(describeFloor(0, 5)).toBe('Rez-de-chaussée sur 5');
        expect(describeFloor(-1, null)).toBe('1er sous-sol');
        expect(describeFloor(null, 4)).toBe('Immeuble de 4 étages');
        expect(describeFloor(null, null)).toBeNull();
    });
});

describe('LeadPropertyCard', () => {
    it('shows every field of the property, the amenities with their icon and the note', () => {
        render(<LeadPropertyCard property={makeLeadPropertyDetail()} />);

        const card = screen.getByTestId('lead-property');
        expect(card).toHaveTextContent('12 rue de Rivoli, 75004 Paris');
        expect(card).toHaveTextContent('T2');
        expect(card).toHaveTextContent('Disponible');
        expect(card).toHaveTextContent('1 chambre');
        expect(card).toHaveTextContent('1 salle de bain');
        expect(card).toHaveTextContent('42 m²');
        expect(card).toHaveTextContent('3e');
        expect(card).toHaveTextContent('Meublé');
        expect(card).toHaveTextContent('Sud, Ouest');
        expect(card).toHaveTextContent('Loi Alur, Bail mobilité');
        expect(card).toHaveTextContent(/1.450,00.€ \/ mois/);
        expect(card).toHaveTextContent(/2.900,00.€/);
        expect(screen.getByText('Ascenseur')).toBeInTheDocument();
        expect(screen.getByText('Balcon')).toBeInTheDocument();
        expect(
            screen.getByText('Visites possibles le samedi matin.'),
        ).toBeInTheDocument();
        // Géocodé : le bien s'ouvre sur la carte.
        expect(
            screen.getByRole('button', { name: 'Voir sur la carte' }),
        ).toBeInTheDocument();
        // Lecture seule sans rappel d'enregistrement.
        expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
    });

    it('pluralises rooms and marks the site thresholds with a plus', () => {
        render(
            <LeadPropertyCard
                property={makeLeadPropertyDetail({ bedrooms: 5, bathrooms: 4 })}
            />,
        );

        const card = screen.getByTestId('lead-property');
        expect(card).toHaveTextContent('5+ chambres');
        expect(card).toHaveTextContent('4+ salles de bain');
    });

    it('keeps every row with a « Non renseigné » tag when nothing is filled, without a map button', () => {
        render(<LeadPropertyCard property={emptyProperty} />);

        const card = screen.getByTestId('lead-property');
        const labels = [...card.querySelectorAll('dt')].map(
            (dt) => dt.textContent,
        );
        expect(labels).toEqual([
            'Adresse',
            'Type de bien',
            'Disponibilité',
            'Chambres',
            'Salles de bain',
            'Surface',
            'Étage',
            "Étages de l'immeuble",
            'Meublé',
            'Orientation',
            'Type de bail',
            'Loyer hors charges',
            'Charges',
            'Dépôt de garantie',
            'Équipements',
            'Note du propriétaire',
        ]);
        expect(screen.getAllByText('Non renseigné')).toHaveLength(16);
        expect(
            screen.queryByRole('button', { name: 'Voir sur la carte' }),
        ).toBeNull();
    });

    it('edits a field in place when the page can save, with the server name of the field', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <LeadPropertyCard
                property={emptyProperty}
                options={makeLeadPropertyOptions()}
                onSave={onSave}
                saving={null}
            />,
        );

        // Un champ vide se complète à sa place.
        await user.click(
            screen.getByRole('button', { name: 'Modifier Surface' }),
        );
        await user.type(
            screen.getByRole('spinbutton', { name: 'Surface' }),
            '55{Enter}',
        );
        expect(onSave).toHaveBeenCalledWith('surface', 55);

        // Une liste s'enregistre dès le choix.
        await user.click(
            screen.getByRole('button', { name: 'Modifier Type de bien' }),
        );
        await user.click(
            screen.getByRole('combobox', { name: 'Type de bien' }),
        );
        await user.click(await screen.findByRole('option', { name: 'T3' }));
        expect(onSave).toHaveBeenCalledWith('property_type', 't3');

        // Le loyer part en centimes.
        await user.click(
            screen.getByRole('button', { name: 'Modifier Loyer hors charges' }),
        );
        await user.type(
            screen.getByRole('spinbutton', { name: 'Loyer hors charges' }),
            '1450{Enter}',
        );
        expect(onSave).toHaveBeenCalledWith('rent_cents', 145_000);

        // L'adresse se tape dans le champ Google Places (simple texte sans clé).
        await user.click(
            screen.getByRole('button', { name: 'Modifier Adresse' }),
        );
        await user.type(
            screen.getByRole('textbox', { name: 'Adresse' }),
            '2 rue B{Enter}',
        );
        expect(onSave).toHaveBeenCalledWith('address', {
            address: '2 rue B',
            place_id: null,
        });
    });
});
