import type { Property, PropertyForm } from '@/types';

/** Formulaire vide ou prérempli depuis un bien (loyer en unités). */
export function initialPropertyForm(property?: Property | null): PropertyForm {
    return {
        title: property?.title ?? '',
        street: property?.street ?? '',
        postal_code: property?.postal_code ?? '',
        city: property?.city ?? 'Paris',
        district: property?.district ? String(property.district) : '',
        status: property?.status ?? 'available',
        property_type: property?.property_type ?? '',
        furnished: property?.furnished ?? '',
        rooms: property?.rooms ? String(property.rooms) : '',
        surface_m2: property?.surface_m2 ? String(property.surface_m2) : '',
        floor:
            property?.floor !== null && property?.floor !== undefined
                ? String(property.floor)
                : '',
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
        currency: property?.currency ?? 'EUR',
        listing_url: property?.listing_url ?? '',
        agent_id: property?.agent?.id ? String(property.agent.id) : '',
        owner_id: property?.owner?.id ? String(property.owner.id) : '',
        notes: property?.notes ?? '',
    };
}

/** Charge utile envoyée à Laravel : nombres convertis, loyer en centimes, vides → null. */
export function propertyFormToPayload(
    form: PropertyForm,
): Record<string, string | number | null> {
    const int = (value: string): number | null =>
        value.trim() === '' ? null : Number.parseInt(value, 10);
    const cents = (value: string): number | null => {
        const normalized = value.replace(/\s/g, '').replace(',', '.');

        return normalized === ''
            ? null
            : Math.round(Number.parseFloat(normalized) * 100);
    };

    return {
        title: form.title.trim() || null,
        street: form.street.trim(),
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
        district: int(form.district),
        status: form.status,
        property_type: form.property_type || null,
        furnished: form.furnished || null,
        rooms: int(form.rooms),
        surface_m2: int(form.surface_m2),
        floor: int(form.floor),
        lease_type: form.lease_type || null,
        rent_cents: cents(form.rent),
        charges_cents: cents(form.charges),
        currency: form.currency,
        listing_url: form.listing_url.trim() || null,
        agent_id: int(form.agent_id),
        owner_id: int(form.owner_id),
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
