import { describe, expect, it } from 'vitest';
import {
    districtFromPostalCode,
    initialPropertyForm,
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
            title: 'T2 lumineux · 11e',
            street: '12 rue Oberkampf',
            district: '11',
            property_type: 't2',
            rent: '1500',
            charges: '100',
            floor: '3',
            lease_type: 'alur',
            agent_id: '7',
        });
        expect(initialPropertyForm(makeProperty({ floor: 0 })).floor).toBe('0');
    });

    it('sends centimes and nulls for blank fields', () => {
        const payload = propertyFormToPayload({
            ...initialPropertyForm(),
            street: ' 5 rue de Bretagne ',
            rent: '1 250,50'.replace(' ', ''),
            rooms: '2',
            charges: '80,5',
            floor: '-1',
            lease_type: 'mobility',
            agent_id: '7',
        });

        expect(payload).toMatchObject({
            title: null,
            street: '5 rue de Bretagne',
            city: 'Paris',
            rent_cents: 125_050,
            charges_cents: 8_050,
            floor: -1,
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
});
