import { describe, expect, it } from 'vitest';
import { parseOwnerRows } from '@/lib/owner-import';

describe('parseOwnerRows', () => {
    it('reads tab-separated lines in the default column order', () => {
        const parsed = parseOwnerRows(
            'Zoé\tMartin\t\tzoe@example.com\t+33 6 12 34 56 78\t8 rue de Rivoli\t75004\tParis',
        );

        expect(parsed.hasHeader).toBe(false);
        expect(parsed.invalid).toEqual([]);
        expect(parsed.rows).toEqual([
            {
                first_name: 'Zoé',
                last_name: 'Martin',
                company: '',
                email: 'zoe@example.com',
                phone: '+33 6 12 34 56 78',
                street: '8 rue de Rivoli',
                postal_code: '75004',
                city: 'Paris',
            },
        ]);
    });

    it('recognises a header line and maps the columns by name', () => {
        const parsed = parseOwnerRows(
            [
                'Nom;Prénom;Société;E-mail;Téléphone;Ville',
                'Martin;Zoé;;zoe@example.com;;Paris',
            ].join('\n'),
        );

        expect(parsed.hasHeader).toBe(true);
        expect(parsed.rows[0]).toMatchObject({
            first_name: 'Zoé',
            last_name: 'Martin',
            email: 'zoe@example.com',
            city: 'Paris',
        });
    });

    it('accepts a company without a person, and skips what the server would refuse', () => {
        const parsed = parseOwnerRows(
            [
                'Société;E-mail;Téléphone;Nom',
                // Société seule : acceptée.
                'SCI du Marais;contact@sci.fr;;',
                // Ni nom ni société.
                ';perdu@example.com;;',
                // Nommé, mais injoignable.
                ';;;Roux',
            ].join('\n'),
        );

        expect(parsed.rows).toHaveLength(1);
        expect(parsed.rows[0]?.company).toBe('SCI du Marais');
        // Les numéros comptent la ligne d'en-tête.
        expect(parsed.invalid).toEqual([3, 4]);
    });

    it('returns nothing for an empty paste', () => {
        expect(parseOwnerRows('   ')).toEqual({
            rows: [],
            invalid: [],
            hasHeader: false,
        });
    });
});
