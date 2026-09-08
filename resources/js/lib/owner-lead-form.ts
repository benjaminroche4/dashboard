import { toCents } from '@/lib/invoice-totals';
import type {
    LeadLanguage,
    LeadProperty,
    LeadSource,
    OwnerLeadEditable,
    OwnerLeadForm,
} from '@/types';

export type OwnerLeadFormErrors = Partial<Record<string, string>>;

/** Identifiant du champ à focaliser pour une clé d'erreur donnée (sinon la clé elle-même). */
export const ownerLeadErrorFields: Record<string, string> = {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    assigned_to: 'assigned_to',
    'property.address': 'property_address',
    'property.property_type': 'property_type',
    'property.property_status': 'property_status',
    'property.bedrooms': 'bedrooms',
    'property.bathrooms': 'bathrooms',
    'property.surface': 'surface',
    'property.floor': 'floor',
    'property.building_floors': 'building_floors',
    'property.furnishing': 'furnishing',
    'property.orientations': 'orientations',
    'property.lease_types': 'lease_types',
    'property.rent_cents': 'rent',
    'property.charges_cents': 'charges',
    'property.deposit_cents': 'deposit',
    'property.amenities': 'amenities',
    'property.note': 'property_note',
};

/** Formulaire vide, langue et source par défaut, responsable pré-rempli. */
export function emptyOwnerLeadForm(defaults: {
    language?: LeadLanguage;
    source: LeadSource;
    assignedTo: number | null;
}): OwnerLeadForm {
    return {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        language: defaults.language ?? 'fr',
        source: defaults.source,
        source_note: '',
        assigned_to: defaults.assignedTo,
        property: {
            address: '',
            place_id: '',
            property_type: '',
            property_status: '',
            bedrooms: null,
            bathrooms: null,
            surface: '',
            floor: '',
            building_floors: '',
            furnishing: '',
            orientations: [],
            lease_types: [],
            rent: '',
            charges: '',
            deposit: '',
            amenities: [],
            note: '',
        },
    };
}

const numberToText = (value: number | null): string =>
    value === null ? '' : String(value);
const centsToEuros = (cents: number | null): string =>
    cents === null ? '' : String(cents / 100);

/** Lead enregistré → formulaire (nombres en chaînes, centimes en euros). */
export function ownerLeadToForm(lead: OwnerLeadEditable): OwnerLeadForm {
    const property: LeadProperty | null = lead.property;
    const empty = emptyOwnerLeadForm({
        language: lead.language,
        source: lead.source,
        assignedTo: lead.assigned_to,
    });

    return {
        ...empty,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source_note: lead.source_note,
        property: property
            ? {
                  address: property.address ?? '',
                  place_id: property.place_id ?? '',
                  property_type: property.property_type ?? '',
                  property_status: property.property_status ?? '',
                  bedrooms: property.bedrooms,
                  bathrooms: property.bathrooms,
                  surface: numberToText(property.surface),
                  floor: numberToText(property.floor),
                  building_floors: numberToText(property.building_floors),
                  furnishing: property.furnishing ?? '',
                  orientations: [...property.orientations],
                  lease_types: [...property.lease_types],
                  rent: centsToEuros(property.rent_cents),
                  charges: centsToEuros(property.charges_cents),
                  deposit: centsToEuros(property.deposit_cents),
                  amenities: [...property.amenities],
                  note: property.note ?? '',
              }
            : empty.property,
    };
}

const isInteger = (value: string): boolean => /^-?\d+$/.test(value.trim());
/** Montant saisi (espaces tolérés, virgule ou point) → centimes. */
const amountToCents = (value: string): number =>
    toCents(value.replace(/\s/g, ''));
const isAmount = (value: string): boolean =>
    /^[\d\s.,]+$/.test(value.trim()) && amountToCents(value) >= 0;

/**
 * Validation locale de la Converting Machine propriétaire, mêmes clés que Laravel.
 * Le contact suffit ; les champs du bien ne sont vérifiés que s'ils sont saisis.
 */
export function validateOwnerLeadForm(
    form: OwnerLeadForm,
): OwnerLeadFormErrors {
    const errors: OwnerLeadFormErrors = {};

    if (form.first_name.trim() === '') {
        errors.first_name = 'Le prénom est obligatoire.';
    }

    if (form.last_name.trim() === '') {
        errors.last_name = 'Le nom est obligatoire.';
    }

    const email = form.email.trim();
    const phone = form.phone.trim();

    if (email === '' && phone === '') {
        errors.email = 'Indiquez au moins un e-mail ou un téléphone.';
        errors.phone = 'Indiquez au moins un e-mail ou un téléphone.';
    }

    if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "L'adresse e-mail n'est pas valide.";
    }

    if (phone !== '' && phone.replace(/\D/g, '').length < 8) {
        errors.phone = 'Le numéro de téléphone est trop court.';
    }

    const { property } = form;

    if (
        property.surface.trim() !== '' &&
        (!isInteger(property.surface) || Number(property.surface) < 0)
    ) {
        errors['property.surface'] =
            'La surface doit être un nombre entier de m².';
    }

    if (property.floor.trim() !== '') {
        const floor = Number(property.floor);

        if (!isInteger(property.floor) || floor < -5 || floor > 99) {
            errors['property.floor'] =
                "L'étage doit être un nombre entier entre -5 et 99.";
        }
    }

    if (property.building_floors.trim() !== '') {
        const floors = Number(property.building_floors);

        if (!isInteger(property.building_floors) || floors < 0 || floors > 99) {
            errors['property.building_floors'] =
                "Le nombre d'étages doit être un entier entre 0 et 99.";
        }
    }

    const amounts: [keyof OwnerLeadForm['property'], string, string][] = [
        ['rent', 'property.rent_cents', 'Le loyer doit être un montant.'],
        [
            'charges',
            'property.charges_cents',
            'Les charges doivent être un montant.',
        ],
        [
            'deposit',
            'property.deposit_cents',
            'Le dépôt de garantie doit être un montant.',
        ],
    ];

    for (const [field, key, message] of amounts) {
        const value = property[field];

        if (
            typeof value === 'string' &&
            value.trim() !== '' &&
            !isAmount(value)
        ) {
            errors[key] = message;
        }
    }

    return errors;
}

const textOrNull = (value: string): string | null =>
    value.trim() === '' ? null : value.trim();
const integerOrNull = (value: string): number | null =>
    value.trim() === '' ? null : Number(value);
const centsOrNull = (value: string): number | null =>
    value.trim() === '' ? null : amountToCents(value);

/** Formulaire → payload attendu par le serveur (centimes, vides en `null`). */
export function ownerLeadFormToPayload(form: OwnerLeadForm) {
    const { property } = form;

    return {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: textOrNull(form.email),
        phone: textOrNull(form.phone),
        company: textOrNull(form.company),
        language: form.language,
        source: form.source,
        source_note: textOrNull(form.source_note),
        assigned_to: form.assigned_to,
        property: {
            address: textOrNull(property.address),
            place_id: textOrNull(property.place_id),
            property_type: property.property_type || null,
            property_status: property.property_status || null,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            surface: integerOrNull(property.surface),
            floor: integerOrNull(property.floor),
            building_floors: integerOrNull(property.building_floors),
            furnishing: property.furnishing || null,
            orientations: property.orientations,
            lease_types: property.lease_types,
            rent_cents: centsOrNull(property.rent),
            charges_cents: centsOrNull(property.charges),
            deposit_cents: centsOrNull(property.deposit),
            amenities: property.amenities,
            note: textOrNull(property.note),
        },
    };
}

export type OwnerLeadPayload = ReturnType<typeof ownerLeadFormToPayload>;
