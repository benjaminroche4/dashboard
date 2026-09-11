import { formatMoney } from '@/lib/format';
import { propertyTitle } from '@/lib/property-title';
import type { Orientation, PropertyAmenity } from '@/types/owners';
import type {
    Property,
    PropertyForm,
    PropertyFormOptions,
    TransitStop,
} from '@/types';

/** Formulaire vide ou prérempli depuis un bien (loyer en unités). */
export function initialPropertyForm(property?: Property | null): PropertyForm {
    return {
        street: property?.street ?? '',
        postal_code: property?.postal_code ?? '',
        city: property?.city ?? 'Paris',
        district: property?.district ? String(property.district) : '',
        status: property?.status ?? 'available',
        property_type: property?.property_type ?? '',
        furnished: property?.furnished ?? '',
        rooms: property?.rooms ? String(property.rooms) : '',
        bedrooms:
            property?.bedrooms === null || property?.bedrooms === undefined
                ? ''
                : String(property.bedrooms),
        bathrooms:
            property?.bathrooms === null || property?.bathrooms === undefined
                ? ''
                : String(property.bathrooms),
        surface_m2: property?.surface_m2 ? String(property.surface_m2) : '',
        floor: property?.floor ?? '',
        building_floors:
            property?.building_floors === null ||
            property?.building_floors === undefined
                ? ''
                : String(property.building_floors),
        orientations: property?.orientations ?? [],
        amenities: property?.amenities ?? [],
        transit: property?.transit ?? [],
        lease_type: property?.lease_type ?? '',
        rent:
            property?.rent_cents !== null && property?.rent_cents !== undefined
                ? String(property.rent_cents / 100)
                : '',
        charges:
            property?.charges_cents !== null &&
            property?.charges_cents !== undefined
                ? String(property.charges_cents / 100)
                : '',
        charges_included: property?.charges_included ?? false,
        deposit:
            property?.deposit_cents !== null &&
            property?.deposit_cents !== undefined
                ? String(property.deposit_cents / 100)
                : '',
        currency: property?.currency ?? 'EUR',
        listing_url: property?.listing_url ?? '',
        agent_id: property?.agent?.id ? String(property.agent.id) : '',
        owner_id: property?.owner?.id ? String(property.owner.id) : '',
        partner_id: property?.partner?.id ? String(property.partner.id) : '',
        notes: property?.notes ?? '',
    };
}

/** Charge utile envoyée à Laravel : nombres convertis, loyer en centimes, vides → null. */
export function propertyFormToPayload(
    form: PropertyForm,
): Record<
    string,
    | string
    | number
    | boolean
    | null
    | TransitStop[]
    | Orientation[]
    | PropertyAmenity[]
> {
    const int = (value: string): number | null =>
        value.trim() === '' ? null : Number.parseInt(value, 10);
    const cents = (value: string): number | null => {
        const normalized = value.replace(/\s/g, '').replace(',', '.');

        return normalized === ''
            ? null
            : Math.round(Number.parseFloat(normalized) * 100);
    };

    return {
        street: form.street.trim(),
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
        district: int(form.district),
        status: form.status,
        property_type: form.property_type || null,
        furnished: form.furnished || null,
        rooms: int(form.rooms),
        bedrooms: int(form.bedrooms),
        bathrooms: int(form.bathrooms),
        surface_m2: int(form.surface_m2),
        floor: form.floor || null,
        building_floors: int(form.building_floors),
        orientations: form.orientations,
        amenities: form.amenities,
        transit: form.transit,
        lease_type: form.lease_type || null,
        rent_cents: cents(form.rent),
        charges_cents: cents(form.charges),
        charges_included: form.charges_included,
        deposit_cents: cents(form.deposit),
        currency: form.currency,
        listing_url: form.listing_url.trim() || null,
        agent_id: int(form.agent_id),
        owner_id: int(form.owner_id),
        partner_id: int(form.partner_id),
        notes: form.notes.trim() || null,
    };
}

/** Arrondissement déduit d'un code postal parisien 750XX, sinon null. */
export function districtFromPostalCode(postalCode: string): number | null {
    const match = /^750(\d{2})$/.exec(postalCode.trim());

    if (!match) {
        return null;
    }

    const district = Number.parseInt(match[1] ?? '', 10);

    return district >= 1 && district <= 20 ? district : null;
}

/** Le bien tel qu'il se lira, à partir de ce qui est saisi. */
export type PropertyFormSummary = {
    /** Nom calculé du bien (« T2 meublé · 42 m² · 11e »), vide sans rien de saisi. */
    name: string;
    address: string | null;
    /** « 11e », déduit du code postal ou saisi. */
    district: string | null;
    statusLabel: string | null;
    /** Type, meublé, surface, pièces, étage : ce qui est renseigné. */
    features: string[];
    /** Loyer mis en forme, mis en avant comme sur une annonce. */
    rent: string | null;
    /** Mention des charges sous le loyer, quand elles sont saisies. */
    charges: string | null;
    /** Vrai dès qu'un lien d'annonce est saisi. */
    hasListing: boolean;
    leaseLabel: string | null;
    agent: string | null;
    owner: string | null;
};

/** Un montant saisi (« 1 500 », « 1500,50 ») en centimes, ou null. */
function amountToCents(value: string): number | null {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const amount = Number.parseFloat(normalized);

    return normalized === '' || Number.isNaN(amount)
        ? null
        : Math.round(amount * 100);
}

/**
 * Récapitulatif en direct du formulaire d'un bien : les valeurs brutes
 * rendues lisibles (libellés des listes, loyer mis en forme, arrondissement).
 */
export function propertyFormSummary(
    form: PropertyForm,
    options: PropertyFormOptions,
): PropertyFormSummary {
    const label = <T extends string>(
        list: { value: T; label: string }[],
        value: string,
    ): string | null =>
        list.find((item) => item.value === value)?.label ?? null;

    const city = [form.postal_code.trim(), form.city.trim()]
        .filter((part) => part !== '')
        .join(' ');
    const address = [form.street.trim(), city]
        .filter((part) => part !== '')
        .join(', ');
    const district =
        form.district.trim() !== ''
            ? form.district.trim()
            : (districtFromPostalCode(form.postal_code)?.toString() ?? null);
    const rentCents = amountToCents(form.rent);
    const chargesCents = amountToCents(form.charges);
    const charges =
        chargesCents === null
            ? null
            : form.charges_included
              ? `dont ${formatMoney(chargesCents, form.currency)} de charges`
              : `+ ${formatMoney(chargesCents, form.currency)} de charges`;

    return {
        name: propertyTitle(form, options),
        address: address === '' ? null : address,
        district: district === null ? null : `${district}e`,
        statusLabel: label(options.propertyStatuses, form.status),
        features: [
            label(options.propertyTypes, form.property_type),
            label(options.furnishedOptions, form.furnished),
            form.surface_m2.trim() === '' ? null : `${form.surface_m2} m²`,
            form.rooms.trim() === '' ? null : `${form.rooms} pièce(s)`,
            label(options.floors, form.floor),
        ].filter((feature): feature is string => feature !== null),
        rent:
            rentCents === null
                ? null
                : `${formatMoney(rentCents, form.currency)} / mois`,
        charges,
        hasListing: form.listing_url.trim() !== '',
        leaseLabel: label(options.leaseTypes, form.lease_type),
        agent:
            options.agents.find((agent) => String(agent.id) === form.agent_id)
                ?.name ?? null,
        owner:
            options.owners.find((owner) => String(owner.id) === form.owner_id)
                ?.name ?? null,
    };
}
