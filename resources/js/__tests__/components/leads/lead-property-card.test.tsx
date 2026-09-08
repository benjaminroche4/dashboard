import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    LeadPropertyCard,
    describeFloor,
} from '@/components/leads/lead-property-card';
import { makeLeadPropertyDetail } from '@/test/fixtures/lead';

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
    it('shows the property facts, the amenities and the note', () => {
        render(<LeadPropertyCard property={makeLeadPropertyDetail()} />);

        const card = screen.getByTestId('lead-property');
        expect(card).toHaveTextContent('12 rue de Rivoli, 75004 Paris');
        expect(card).toHaveTextContent('T2');
        expect(card).toHaveTextContent('Disponible');
        expect(card).toHaveTextContent('1 chambre · 1 salle de bain');
        expect(card).toHaveTextContent('42 m²');
        expect(card).toHaveTextContent('3e sur 6');
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
    });

    it('pluralises rooms and marks the site thresholds with a plus', () => {
        render(
            <LeadPropertyCard
                property={makeLeadPropertyDetail({ bedrooms: 5, bathrooms: 4 })}
            />,
        );

        expect(screen.getByTestId('lead-property')).toHaveTextContent(
            '5+ chambres · 4+ salles de bain',
        );
    });

    it('falls back to « Non renseigné » when nothing is filled', () => {
        render(
            <LeadPropertyCard
                property={makeLeadPropertyDetail({
                    address: null,
                    property_type_label: null,
                    property_status_label: null,
                    bedrooms: null,
                    bathrooms: null,
                    surface: null,
                    floor: null,
                    building_floors: null,
                    furnishing_label: null,
                    orientation_labels: [],
                    lease_type_labels: [],
                    rent_cents: null,
                    charges_cents: null,
                    deposit_cents: null,
                    amenity_labels: [],
                    note: null,
                })}
            />,
        );

        expect(screen.getByText('Non renseigné')).toBeInTheDocument();
        expect(screen.queryByTestId('lead-property')).toBeNull();
    });
});
