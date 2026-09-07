import { describe, expect, it } from 'vitest';
import { parseAgentRows } from '@/lib/real-estate-import';

describe('parseAgentRows', () => {
    it('reads tab-separated rows in the default column order', () => {
        const parsed = parseAgentRows(
            'Zoé\tMartin\tAgence du Marais\tNégociatrice\tzoe@marais.fr\t+33 6 12 34 56 78\nAli\tBensaïd\n',
        );

        expect(parsed.hasHeader).toBe(false);
        expect(parsed.invalid).toEqual([]);
        expect(parsed.rows).toEqual([
            {
                first_name: 'Zoé',
                last_name: 'Martin',
                agency: 'Agence du Marais',
                position: 'Négociatrice',
                email: 'zoe@marais.fr',
                phone: '+33 6 12 34 56 78',
            },
            {
                first_name: 'Ali',
                last_name: 'Bensaïd',
                agency: '',
                position: '',
                email: '',
                phone: '',
            },
        ]);
    });

    it('maps a header row with French labels in any order and semicolons', () => {
        const parsed = parseAgentRows(
            'Nom;Prénom;E-mail;Agence\nMartin;Zoé;zoe@marais.fr;Agence du Marais',
        );

        expect(parsed.hasHeader).toBe(true);
        expect(parsed.rows).toEqual([
            {
                first_name: 'Zoé',
                last_name: 'Martin',
                agency: 'Agence du Marais',
                position: '',
                email: 'zoe@marais.fr',
                phone: '',
            },
        ]);
    });

    it('skips rows without first or last name and reports their line numbers', () => {
        const parsed = parseAgentRows('prenom,nom\nZoé,Martin\n,Dupont\nAli,');

        expect(parsed.rows).toHaveLength(1);
        expect(parsed.invalid).toEqual([3, 4]);
        expect(parseAgentRows('   ')).toEqual({
            rows: [],
            invalid: [],
            hasHeader: false,
        });
    });
});
