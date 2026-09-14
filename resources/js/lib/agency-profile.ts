import type {
    AgencyAiProfile,
    AgencyProfile,
    AgencyProfileForm,
    ProfileOptions,
} from '@/types';

/** Les vingt arrondissements, en pastilles. */
export const districtOptions = Array.from({ length: 20 }, (_, index) => ({
    value: String(index + 1),
    label: index === 0 ? '1er' : `${index + 1}e`,
}));

export function districtLabel(district: number): string {
    return district === 1 ? '1er' : `${district}e`;
}

/** Formulaire du profil depuis la fiche (agence complète, ou agent : trois listes). */
export function initialProfileForm(
    profile: Partial<AgencyProfile> | null | undefined,
): AgencyProfileForm {
    return {
        districts: profile?.districts ?? [],
        specialties: profile?.specialties ?? [],
        languages: profile?.languages ?? [],
        mandate_types: profile?.mandate_types ?? [],
        fee_note: profile?.fee_note ?? '',
        rent_min:
            profile?.rent_min_cents == null
                ? ''
                : String(profile.rent_min_cents / 100),
        rent_max:
            profile?.rent_max_cents == null
                ? ''
                : String(profile.rent_max_cents / 100),
        accepts_garantme: tri(profile?.accepts_garantme),
        accepts_foreign_files: tri(profile?.accepts_foreign_files),
    };
}

function tri(value: boolean | null | undefined): '' | '1' | '0' {
    return value == null ? '' : value ? '1' : '0';
}

/** Ce que le serveur attend : loyers en centimes, tri-états en booléens ou null. */
export function profileFormToPayload(form: AgencyProfileForm) {
    const cents = (value: string): number | null => {
        const parsed = Number.parseFloat(value.replace(',', '.'));

        return Number.isFinite(parsed) && value.trim() !== ''
            ? Math.round(parsed * 100)
            : null;
    };
    const bool = (value: '' | '1' | '0'): boolean | null =>
        value === '' ? null : value === '1';

    return {
        districts: form.districts,
        specialties: form.specialties,
        languages: form.languages,
        mandate_types: form.mandate_types,
        fee_note: form.fee_note.trim() || null,
        rent_min_cents: cents(form.rent_min),
        rent_max_cents: cents(form.rent_max),
        accepts_garantme: bool(form.accepts_garantme),
        accepts_foreign_files: bool(form.accepts_foreign_files),
    };
}

/** Libellés d'une liste de valeurs, d'après les options du dialogue. */
export function labelsFor(
    values: string[] | null | undefined,
    options: { value: string; label: string }[],
): string[] {
    return (values ?? [])
        .map((value) => options.find((option) => option.value === value)?.label)
        .filter((label): label is string => label !== undefined);
}

/**
 * Lignes lisibles de la proposition de l'assistant, pour la relecture :
 * seuls les champs qu'elle renseigne sont listés.
 */
export function aiProfileLines(
    proposal: AgencyAiProfile,
    options: ProfileOptions,
): { label: string; value: string }[] {
    const lines: { label: string; value: string }[] = [];
    const push = (label: string, value: string | null | undefined) => {
        if (value) {
            lines.push({ label, value });
        }
    };
    push(
        'Quartiers',
        (proposal.districts ?? []).map(districtLabel).join(', ') || null,
    );
    push(
        'Spécialités',
        labelsFor(proposal.specialties, options.specialties).join(', ') || null,
    );
    push(
        'Langues',
        labelsFor(proposal.languages, options.languages).join(', ') || null,
    );
    push(
        'Mandats',
        labelsFor(proposal.mandate_types, options.mandateTypes).join(', ') ||
            null,
    );
    push('Frais', proposal.fee_note);
    push('Loyers', rentRange(proposal.rent_min_cents, proposal.rent_max_cents));
    push('Garantme', yesNo(proposal.accepts_garantme));
    push('Dossiers étrangers', yesNo(proposal.accepts_foreign_files));

    return lines;
}

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
