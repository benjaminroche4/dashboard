import { describe, expect, it } from 'vitest';
import { hasProjectSentence, projectSentence } from '@/lib/project-sentence';

describe('projectSentence', () => {
    it('says the project the way one would to a landlord', () => {
        expect(
            projectSentence(
                {
                    property_types: ['T2', 'Loft'],
                    furnished_label: 'Meublé',
                    districts: [9, 6],
                    duration_label: 'Moyen terme · 3 à 12 mois',
                },
                '2 600,00 €',
            ),
        ).toBe(
            'Cherche T2 ou Loft meublé dans le 6e ou le 9e pour 2 600,00 € par mois, moyen terme.',
        );
    });

    it('falls back to a generic housing search and ignores « Indifférent »', () => {
        const empty = {
            property_types: [],
            furnished_label: 'Indifférent',
            districts: [],
            duration_label: null,
        };
        expect(projectSentence(empty, null)).toBe(
            'Cherche un logement à Paris.',
        );
        expect(hasProjectSentence(empty, null)).toBe(false);
        expect(hasProjectSentence(empty, '1 000 €')).toBe(true);
    });
});
