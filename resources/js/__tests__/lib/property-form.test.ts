import { describe, expect, it } from 'vitest';
import { propertyFormOptions } from '@/test/fixtures/property';
import {
    districtFromPostalCode,
    initialPropertyForm,
    propertyFormSummary,
    propertyFormToPayload,
} from '@/lib/property-form';
import { makeProperty } from '@/test/fixtures/property';

describe('property form helpers', () => {
    it('starts empty in Paris and prefills from a property with the rent in units', () => {
        expect(initialPropertyForm()).toMatchObject({
            street: '',
            city: 'Paris',
            currency: 'EUR',
            rent: '',
            agent_id: '',
        });
        expect(initialPropertyForm(makeProperty())).toMatchObject({
            street: '12 rue Oberkampf',
            district: '11',
            property_type: 't2',
            rent: '1500',
            charges: '100',
            floor: '3',
            lease_type: 'alur',
            agent_id: '7',
        });
        expect(
            initialPropertyForm(makeProperty({ floor: 'ground' })).floor,
        ).toBe('ground');
    });

    it('sends centimes and nulls for blank fields', () => {
        const payload = propertyFormToPayload({
            ...initialPropertyForm(),
            street: ' 5 rue de Bretagne ',
            rent: '1 250,50'.replace(' ', ''),
            rooms: '2',
            charges: '80,5',
            floor: 'top',
            lease_type: 'mobility',
            agent_id: '7',
        });

        expect(payload).toMatchObject({
            street: '5 rue de Bretagne',
            city: 'Paris',
            rent_cents: 125_050,
            charges_cents: 8_050,
            floor: 'top',
            lease_type: 'mobility',
            rooms: 2,
            surface_m2: null,
            property_type: null,
            agent_id: 7,
            owner_id: null,
        });
        expect(propertyFormToPayload(initialPropertyForm())).toMatchObject({
            charges_cents: null,
            floor: null,
            lease_type: null,
        });
    });

    it('derives the district from a Paris postal code only', () => {
        expect(districtFromPostalCode('75011')).toBe(11);
        expect(districtFromPostalCode('75001')).toBe(1);
        expect(districtFromPostalCode('75021')).toBeNull();
        expect(districtFromPostalCode('92100')).toBeNull();
        expect(districtFromPostalCode('')).toBeNull();
    });

    /** Intl sépare les milliers d'une espace fine insécable : on la banalise. */
    const plainSpaces = (value: string | null) =>
        value?.replace(/[\u202f\u00a0]/g, ' ') ?? null;

    it('reads the form back as the property will be shown', () => {
        const summary = propertyFormSummary(
            {
                ...initialPropertyForm(),
                street: '5 rue de Bretagne',
                postal_code: '75003',
                property_type: 't2',
                furnished: 'furnished',
                rooms: '2',
                surface_m2: '42',
                floor: 'ground',
                lease_type: 'mobility',
                rent: '1 800',
                charges: '90',
                agent_id: '7',
                owner_id: '3',
            },
            propertyFormOptions,
        );

        expect(summary).toMatchObject({
            // Le nom est calculé : type meublé, surface, arrondissement.
            name: 'T2 meublé · 42 m² · 3e',
            address: '5 rue de Bretagne, 75003 Paris',
            // L'arrondissement se déduit du code postal, comme à l'envoi.
            district: '3e',
            statusLabel: 'Disponible',
            features: [
                'T2',
                'Meublé',
                '42 m²',
                '2 pièce(s)',
                'Rez-de-chaussée',
            ],
            leaseLabel: 'Bail mobilité',
            agent: 'Zoé Martin',
            owner: 'Ali Bensaïd',
        });
        // Le loyer est le chiffre mis en avant ; les charges le complètent.
        expect(plainSpaces(summary.rent)).toBe('1 800,00 € / mois');
        expect(plainSpaces(summary.charges)).toBe('+ 90,00 € de charges');
    });

    it('says the charges are included when the box is ticked, and stays quiet without a rent', () => {
        expect(
            plainSpaces(
                propertyFormSummary(
                    {
                        ...initialPropertyForm(),
                        rent: '1800',
                        charges: '90',
                        charges_included: true,
                    },
                    propertyFormOptions,
                ).charges,
            ),
        ).toBe('dont 90,00 € de charges');

        const empty = propertyFormSummary(
            initialPropertyForm(),
            propertyFormOptions,
        );
        expect(empty.rent).toBeNull();
        expect(empty.charges).toBeNull();
        expect(empty.hasListing).toBe(false);
        expect(empty.name).toBe('');
        expect(empty.district).toBeNull();
        expect(empty.features).toEqual([]);
    });
});
