import { describe, expect, it } from 'vitest';
import { tenantDetails } from '@/lib/tenant-profile';
import { makeTenantProfile } from '@/test/fixtures/tenant-profile';

describe('tenantDetails', () => {
    it('lists the details in order, dates and money formatted', () => {
        const details = tenantDetails(makeTenantProfile());

        expect(details.map((detail) => detail.label)).toEqual([
            'Naissance',
            'Nationalité',
            'Lieu de naissance',
            'Séjour',
            'Numéro du titre',
            'Valable jusqu’au',
            'Statut',
            'Employeur',
            'Revenu net',
        ]);
        expect(details[0]!.value).toBe('12 mai 1994');
        expect(details.at(-1)!.value).toContain('/ mois');
    });

    it('hides the permit number and validity for a citizen of the European Union', () => {
        const details = tenantDetails(
            makeTenantProfile({
                residency_status: 'ue',
                residency_label: 'Citoyen de l’Union européenne',
                residency_needs_document: false,
            }),
        );

        expect(details.map((detail) => detail.label)).not.toContain(
            'Numéro du titre',
        );
        expect(details.map((detail) => detail.label)).not.toContain(
            'Valable jusqu’au',
        );
    });

    it('omits every empty field', () => {
        const details = tenantDetails(
            makeTenantProfile({
                birth_date: null,
                nationality: null,
                birth_place: null,
                residency_status: null,
                residency_label: null,
                residency_needs_document: false,
                employment_status: null,
                employment_label: null,
                employer: null,
                income_cents: null,
            }),
        );

        expect(details).toEqual([]);
    });
});
