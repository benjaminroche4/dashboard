import { describe, expect, it } from 'vitest';
import {
    aiProfileLines,
    initialProfileForm,
    profileFormToPayload,
    rentRange,
} from '@/lib/agency-profile';

describe('agency profile helpers', () => {
    it('builds the form from the profile and sends rents in cents, tri-states as booleans', () => {
        const form = initialProfileForm({
            districts: [11],
            specialties: ['furnished'],
            rent_min_cents: 120_000,
            rent_max_cents: null,
            accepts_garantme: false,
            accepts_foreign_files: null,
        });

        expect(form.rent_min).toBe('1200');
        expect(form.rent_max).toBe('');
        expect(form.accepts_garantme).toBe('0');
        expect(form.accepts_foreign_files).toBe('');

        expect(
            profileFormToPayload({
                ...form,
                rent_max: '2 500,50'.replace(' ', ''),
                fee_note: '  ',
            }),
        ).toEqual({
            districts: [11],
            specialties: ['furnished'],
            languages: [],
            mandate_types: [],
            fee_note: null,
            rent_min_cents: 120_000,
            rent_max_cents: 250_050,
            accepts_garantme: false,
            accepts_foreign_files: null,
        });
    });

    it('phrases a rent range and lists only the fields the assistant filled', () => {
        // Espace fine insécable du format français : c'est bien un seul caractère.
        expect(rentRange(100_000, 200_000)).toBe(
            '1\u202f000 € – 2\u202f000 € / mois',
        );
        expect(rentRange(null, 200_000)).toBe('jusqu’à 2\u202f000 € / mois');
        expect(rentRange(null, null)).toBeNull();

        const lines = aiProfileLines(
            {
                summary: '',
                notes: '',
                districts: [1, 4],
                specialties: null,
                languages: ['en', 'xx'],
                mandate_types: [],
                fee_note: null,
                rent_min_cents: null,
                rent_max_cents: null,
                accepts_garantme: null,
                accepts_foreign_files: false,
            },
            {
                specialties: [],
                languages: [{ value: 'en', label: 'Anglais' }],
                mandateTypes: [],
            },
        );

        expect(lines).toEqual([
            { label: 'Quartiers', value: '1er, 4e' },
            { label: 'Langues', value: 'Anglais' },
            { label: 'Dossiers étrangers', value: 'Non' },
        ]);
    });
});
