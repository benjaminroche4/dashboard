import { describe, expect, it } from 'vitest';
import { countLabel, dossierCounts } from '@/lib/clients';
import { makeClient } from '@/test/fixtures/client';

describe('dossierCounts', () => {
    it('pluralises invoices and document requests separately', () => {
        expect(dossierCounts(makeClient())).toBe('1 facture · 2 demandes');
        expect(
            dossierCounts(
                makeClient({ invoices_count: 3, document_requests_count: 0 }),
            ),
        ).toBe('3 factures · 0 demande');
    });
});

describe('countLabel', () => {
    it('adds an s above one and accepts an invariable plural', () => {
        expect(countLabel(0, 'note')).toBe('0 note');
        expect(countLabel(1, 'facture')).toBe('1 facture');
        expect(countLabel(2, 'facture')).toBe('2 factures');
        expect(countLabel(4, 'devis', 'devis')).toBe('4 devis');
    });
});
