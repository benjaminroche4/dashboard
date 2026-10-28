/** Les vingt arrondissements, en pastilles. */
export const districtOptions = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: index === 0 ? '1er' : `${index + 1}e`,
}));

export function districtLabel(district: number): string {
    return district === 1 ? '1er' : `${district}e`;
}

/** Formulaire du profil depuis la fiche (agence complète, ou agent : trois listes). */
export function rentRange(
    min: number | null | undefined,
    max: number | null | undefined,
): string | null {
    const euros = (cents: number) =>
        `${new Intl.NumberFormat('fr-FR').format(cents / 100)} €`;

    if (min != null && max != null) {
        return `${euros(min)} – ${euros(max)} / mois`;
    }
    if (min != null) {
        return `à partir de ${euros(min)} / mois`;
    }
    if (max != null) {
        return `jusqu’à ${euros(max)} / mois`;
    }

    return null;
}

export function yesNo(value: boolean | null | undefined): string | null {
    return value == null ? null : value ? 'Oui' : 'Non';
}
