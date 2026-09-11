import type { PropertyForm, PropertyFormOptions } from '@/types';
import { districtFromPostalCode } from '@/lib/property-form';

/**
 * Nom d'un bien calculé depuis ses caractéristiques, miroir de
 * `App\Support\PropertyTitle` : « T2 meublé · 42 m² · 11e ». Personne ne le
 * saisit ; le récapitulatif du formulaire montre celui qui sera enregistré.
 */
export function propertyTitle(
    form: PropertyForm,
    options: PropertyFormOptions,
): string {
    const label = <T extends string>(
        list: { value: T; label: string }[],
        value: string,
    ): string | null =>
        list.find((item) => item.value === value)?.label ?? null;

    // « T2 meublé » se lit d'un bloc, comme côté serveur ; « meublé » seul ne
    // nomme rien, il qualifie le type.
    const type = label(options.propertyTypes, form.property_type);
    const kind =
        type === null
            ? null
            : [type, form.furnished === 'furnished' ? 'meublé' : null]
                  .filter((part): part is string => part !== null)
                  .join(' ');

    const district =
        form.district.trim() !== ''
            ? form.district.trim()
            : (districtFromPostalCode(form.postal_code)?.toString() ?? null);
    const place =
        district !== null
            ? district === '1'
                ? '1er'
                : `${district}e`
            : form.city.trim() || null;

    const surface =
        form.surface_m2.trim() === '' ? null : `${form.surface_m2.trim()} m²`;

    // Un arrondissement ne nomme pas un logement : sans type ni surface, la
    // rue reste le nom le plus parlant (même règle que côté serveur).
    if (kind === null && surface === null) {
        return form.street.trim();
    }

    return [kind, surface, place]
        .filter((part): part is string => part !== null && part !== '')
        .join(' · ');
}
