import { formatDate, formatMoney } from '@/lib/format';
import type { TenantProfile } from '@/types';

export type TenantDetail = { label: string; value: string };

/**
 * Détails renseignés d'un locataire, dans l'ordre d'affichage : état civil,
 * séjour, situation professionnelle. Les champs vides sont omis, et le titre
 * de séjour d'un citoyen de l'UE n'affiche ni numéro ni validité.
 */
export function tenantDetails(profile: TenantProfile): TenantDetail[] {
    const details: TenantDetail[] = [];
    const push = (label: string, value: string | null | undefined) => {
        if (value !== null && value !== undefined && value !== '') {
            details.push({ label, value });
        }
    };

    push(
        'Naissance',
        profile.birth_date ? formatDate(profile.birth_date) : null,
    );
    push('Nationalité', profile.nationality);
    push('Lieu de naissance', profile.birth_place);
    push('Séjour', profile.residency_label);

    if (profile.residency_needs_document) {
        push('Numéro du titre', profile.residency_number);
        push(
            'Valable jusqu’au',
            profile.residency_expires_at
                ? formatDate(profile.residency_expires_at)
                : null,
        );
    }

    push('Statut', profile.employment_label);
    push('Employeur', profile.employer);
    push(
        'Revenu net',
        profile.income_cents === null
            ? null
            : `${formatMoney(profile.income_cents, 'EUR')} / mois`,
    );

    return details;
}
