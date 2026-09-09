import type { Property, PropertyFormOptions } from '@/types';

/** Miroir de PropertyController::formOptions(). */
export const propertyFormOptions: PropertyFormOptions = {
    propertyTypes: [
        { value: 'studio', label: 'Studio' },
        { value: 't2', label: 'T2' },
        { value: 't3', label: 'T3' },
    ],
    propertyStatuses: [
        { value: 'available', label: 'Disponible' },
        { value: 'under_offer', label: 'Sous option' },
        { value: 'rented', label: 'Loué' },
        { value: 'under_renovation', label: 'En travaux' },
        { value: 'unavailable', label: 'Non disponible' },
    ],
    furnishedOptions: [
        { value: 'furnished', label: 'Meublé' },
        { value: 'unfurnished', label: 'Non meublé' },
    ],
    leaseTypes: [
        { value: 'alur', label: 'Loi Alur' },
        { value: 'mobility', label: 'Bail mobilité' },
    ],
    currencies: ['EUR', 'CHF'],
    agents: [{ id: 7, name: 'Zoé Martin', agency: 'Agence du Marais' }],
    owners: [{ id: 3, name: 'Ali Bensaïd' }],
};

/** Miroir de PropertyFactory : T2 meublé dans le 11e à 1 500 € par mois. */
export function makeProperty(overrides: Partial<Property> = {}): Property {
    return {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000f1',
        title: 'T2 lumineux · 11e',
        label: 'T2 lumineux · 11e',
        street: '12 rue Oberkampf',
        postal_code: '75011',
        city: 'Paris',
        district: 11,
        status: 'available',
        status_label: 'Disponible',
        property_type: 't2',
        property_type_label: 'T2',
        furnished: 'furnished',
        furnished_label: 'Meublé',
        rooms: 2,
        surface_m2: 42,
        floor: 3,
        lease_type: 'alur',
        lease_type_label: 'Loi Alur',
        rent_cents: 150_000,
        charges_cents: 10_000,
        currency: 'EUR',
        listing_url: 'https://www.seloger.com/annonces/123.htm',
        agent: {
            id: 7,
            uuid: 'agent-uuid',
            name: 'Zoé Martin',
            agency: 'Agence du Marais',
        },
        owner: null,
        photos: [],
        notes: null,
        visits_count: 2,
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}
