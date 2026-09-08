import { describe, expect, it } from 'vitest';
import {
    emptyOwnerLeadForm,
    ownerLeadErrorFields,
    ownerLeadFormToPayload,
    ownerLeadToForm,
    validateOwnerLeadForm,
} from '@/lib/owner-lead-form';
import { makeOwnerLeadEditable } from '@/test/fixtures/lead';

const base = emptyOwnerLeadForm({ source: 'website', assignedTo: 1 });

describe('emptyOwnerLeadForm', () => {
    it('starts in French with the given source and assignee and an empty property', () => {
        expect(base.language).toBe('fr');
        expect(base.source).toBe('website');
        expect(base.assigned_to).toBe(1);
        expect(base.property.amenities).toEqual([]);
        expect(base.property.bedrooms).toBeNull();
    });
});

describe('ownerLeadToForm', () => {
    it('turns cents into euros and numbers into strings', () => {
        const form = ownerLeadToForm(makeOwnerLeadEditable());

        expect(form.first_name).toBe('Paul');
        expect(form.property.rent).toBe('1450');
        expect(form.property.charges).toBe('120');
        expect(form.property.surface).toBe('42');
        expect(form.property.floor).toBe('3');
        expect(form.property.bedrooms).toBe(1);
        expect(form.property.amenities).toEqual(['elevator', 'balcony']);
    });

    it('keeps an empty property when the lead has none', () => {
        const form = ownerLeadToForm(makeOwnerLeadEditable({ property: null }));

        expect(form.property).toEqual(base.property);
    });
});

describe('validateOwnerLeadForm', () => {
    it('requires the names and an e-mail or a phone', () => {
        const errors = validateOwnerLeadForm(base);

        expect(errors.first_name).toBeDefined();
        expect(errors.last_name).toBeDefined();
        expect(errors.email).toBe(
            'Indiquez au moins un e-mail ou un téléphone.',
        );
        expect(errors.phone).toBeDefined();
    });

    it('checks the e-mail format and the phone length', () => {
        expect(
            validateOwnerLeadForm({
                ...base,
                first_name: 'A',
                last_name: 'B',
                email: 'nope',
            }).email,
        ).toBe("L'adresse e-mail n'est pas valide.");
        expect(
            validateOwnerLeadForm({
                ...base,
                first_name: 'A',
                last_name: 'B',
                phone: '+33 6',
            }).phone,
        ).toBe('Le numéro de téléphone est trop court.');
    });

    it('only checks property numbers when they are filled, with Laravel keys', () => {
        const filled = {
            ...base,
            first_name: 'Paul',
            last_name: 'Roux',
            email: 'paul@example.com',
        };

        expect(validateOwnerLeadForm(filled)).toEqual({});
        expect(
            validateOwnerLeadForm({
                ...filled,
                property: {
                    ...filled.property,
                    surface: '12.5',
                    floor: '120',
                    building_floors: '-1',
                    rent: 'abc',
                    charges: '1 200',
                    deposit: '-3',
                },
            }),
        ).toEqual({
            'property.surface': 'La surface doit être un nombre entier de m².',
            'property.floor':
                "L'étage doit être un nombre entier entre -5 et 99.",
            'property.building_floors':
                "Le nombre d'étages doit être un entier entre 0 et 99.",
            'property.rent_cents': 'Le loyer doit être un montant.',
            'property.deposit_cents':
                'Le dépôt de garantie doit être un montant.',
        });
    });
});

describe('ownerLeadFormToPayload', () => {
    it('sends cents, integers and nulls for blanks', () => {
        const payload = ownerLeadFormToPayload({
            ...base,
            first_name: ' Paul ',
            last_name: 'Roux',
            email: 'paul@example.com',
            property: {
                ...base.property,
                address: '12 rue de Rivoli, Paris',
                property_type: 't2',
                bedrooms: 1,
                surface: '42',
                floor: '3',
                rent: '1 450,50',
                charges: '120',
                orientations: ['south'],
                amenities: ['elevator'],
            },
        });

        expect(payload.first_name).toBe('Paul');
        expect(payload.phone).toBeNull();
        expect(payload.company).toBeNull();
        expect(payload.property.address).toBe('12 rue de Rivoli, Paris');
        expect(payload.property.place_id).toBeNull();
        expect(payload.property.property_type).toBe('t2');
        expect(payload.property.property_status).toBeNull();
        expect(payload.property.bedrooms).toBe(1);
        expect(payload.property.bathrooms).toBeNull();
        expect(payload.property.surface).toBe(42);
        expect(payload.property.floor).toBe(3);
        expect(payload.property.building_floors).toBeNull();
        expect(payload.property.furnishing).toBeNull();
        expect(payload.property.rent_cents).toBe(145_050);
        expect(payload.property.charges_cents).toBe(12_000);
        expect(payload.property.deposit_cents).toBeNull();
        expect(payload.property.orientations).toEqual(['south']);
        expect(payload.property.amenities).toEqual(['elevator']);
        expect(payload.property.note).toBeNull();
    });
});

describe('ownerLeadErrorFields', () => {
    it('maps server keys to the field ids', () => {
        expect(ownerLeadErrorFields['property.rent_cents']).toBe('rent');
        expect(ownerLeadErrorFields['property.address']).toBe(
            'property_address',
        );
    });
});
