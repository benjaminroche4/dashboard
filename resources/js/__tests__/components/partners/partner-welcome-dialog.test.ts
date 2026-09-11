import { describe, expect, it } from 'vitest';
import { welcomeRecipients } from '@/components/partners/partner-welcome-dialog';
import { makePartnerContact } from '@/test/fixtures/partner';

const partner = { name: 'Zen Assurances', email: 'contact@zen.example' };

describe('welcomeRecipients', () => {
    it('proposes the partner first, then each contact with an address', () => {
        const recipients = welcomeRecipients(partner, [
            makePartnerContact(),
            makePartnerContact({
                id: 2,
                name: 'Paul Gaudin',
                email: 'paul@zen.example',
                position: null,
            }),
        ]);

        expect(recipients.map((r) => r.email)).toEqual([
            'contact@zen.example',
            'marie@zen.example',
            'paul@zen.example',
        ]);
        expect(recipients[0]?.hint).toBe('Adresse du partenaire');
        expect(recipients[1]?.hint).toBe('Commercial');
        // Sans fonction, l'aide reste explicite.
        expect(recipients[2]?.hint).toBe('Interlocuteur');
    });

    it('skips contacts without an address and never repeats one', () => {
        const recipients = welcomeRecipients(partner, [
            makePartnerContact({ email: null }),
            makePartnerContact({ id: 3, email: 'CONTACT@zen.example' }),
        ]);

        expect(recipients).toHaveLength(1);
    });

    it('is empty when nothing is known', () => {
        expect(welcomeRecipients({ name: 'X', email: null }, [])).toEqual([]);
    });
});
