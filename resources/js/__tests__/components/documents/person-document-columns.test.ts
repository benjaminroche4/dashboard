import { describe, expect, it } from 'vitest';
import { personDocumentRows } from '@/components/documents/person-document-columns';
import type { HouseholdPersonDetail } from '@/types';

const person: HouseholdPersonDetail = {
    name: 'Léa Durand',
    role: 'Locataire',
    categories: [
        {
            value: 'finance',
            label: 'Finance',
            documents: [
                { label: 'RIB', hint: 'Français de préférence', uploads: [] },
                { label: 'Avis d’imposition', hint: null },
            ],
        },
        {
            value: 'identity',
            label: 'Identité',
            documents: [{ label: 'Passeport', hint: null, uploads: [] }],
        },
    ],
} as HouseholdPersonDetail;

describe('personDocumentRows', () => {
    it('flattens the categories: one row per requested document', () => {
        const rows = personDocumentRows(person);

        expect(rows).toHaveLength(3);
        // Chaque ligne porte sa catégorie : un tri ne disperse plus un groupe
        // dont seule la première ligne aurait été étiquetée.
        expect(rows.map((row) => row.categoryLabel)).toEqual([
            'Finance',
            'Finance',
            'Identité',
        ]);
        expect(rows[0]?.hint).toBe('Français de préférence');
    });

    it('treats a document without files as an empty list, never undefined', () => {
        expect(personDocumentRows(person)[1]?.uploads).toEqual([]);
    });
});
