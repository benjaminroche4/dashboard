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
    orientations: [
        { value: 'north', label: 'Nord' },
        { value: 'south', label: 'Sud' },
    ],
    amenities: [
        { value: 'elevator', label: 'Ascenseur' },
        { value: 'balcony', label: 'Balcon' },
        { value: 'wifi', label: 'Wi-Fi' },
    ],
    // Miroir de PropertyFloor::options().
    floors: [
        { value: 'ground', label: 'Rez-de-chaussée' },
        { value: '1', label: '1er étage' },
        { value: '2', label: '2e étage' },
        { value: '3', label: '3e étage' },
        { value: '4', label: '4e étage' },
        { value: '5', label: '5e étage' },
        { value: '6', label: '6e étage' },
        { value: '7', label: '7e étage' },
        { value: 'above', label: '8e étage et plus' },
        { value: 'top', label: 'Dernier étage' },
    ],
    partners: [{ id: 5, name: 'Garantme', type: 'Garantie' }],
    partnerTypes: [
        { value: 'management', label: 'Gestion' },
        { value: 'insurance', label: 'Assurance' },
    ],
    leaseTypes: [
        { value: 'alur', label: 'Loi Alur' },
        { value: 'mobility', label: 'Bail mobilité' },
    ],
    currencies: ['EUR', 'CHF'],
    agents: [{ id: 7, name: 'Zoé Martin', agency: 'Agence du Marais' }],
    owners: [{ id: 3, name: 'Ali Bensaïd' }],
    agencies: [
        {
            id: 5,
            uuid: '0199a9a0-0000-7000-8000-0000000000a5',
            name: 'Agence du Marais',
        },
    ],
    ownerKinds: [
        {
            value: 'individual',
            label: 'Particulier',
            hint: 'Une personne physique, propriétaire en son nom.',
        },
        {
            value: 'company',
            label: 'Société ou agence',
            hint: 'Une SCI, une agence ou une foncière ; l’interlocuteur reste facultatif.',
        },
    ],
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
        bedrooms: 1,
        bathrooms: 1,
        surface_m2: 42,
        floor: '3',
        partner: null,
        transit: [
            { kind: 'metro', name: 'Oberkampf', lines: ['2', '9'], minutes: 4 },
            { kind: 'bus', name: 'Saint-Maur', lines: ['96'], minutes: 6 },
        ],
        floor_label: '3e étage',
        building_floors: 6,
        orientations: ['south'],
        orientation_labels: ['Sud'],
        amenities: ['elevator', 'balcony'],
        amenity_labels: ['Ascenseur', 'Balcon'],
        lease_type: 'alur',
        lease_type_label: 'Loi Alur',
        rent_cents: 150_000,
        charges_cents: 10_000,
        charges_included: false,
        deposit_cents: 150_000,
        currency: 'EUR',
        listing_url: 'https://www.seloger.com/annonces/123.htm',
        agent: {
            id: 7,
            uuid: 'agent-uuid',
            name: 'Zoé Martin',
            agency: 'Agence du Marais',
        },
        owner: null,
        assigned_lead: null,
        assigned_at: null,
        photos: [],
        photo_paths: [],
        notes: null,
        visits_count: 2,
        creator: 'Admin',
        creator_avatar: null,
        created_at: '2026-09-06T10:00:00+00:00',
        ...overrides,
    };
}
