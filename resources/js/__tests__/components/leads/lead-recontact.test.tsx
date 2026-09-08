import { render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('@inertiajs/react', () => ({ router: { patch } }));

import {
    LeadRecontact,
    describeRecontact,
} from '@/components/leads/lead-recontact';
import { makeLeadDetail } from '@/test/fixtures/lead';

const channels = [
    { value: 'phone' as const, label: 'Téléphone' },
    { value: 'whatsapp' as const, label: 'WhatsApp' },
];

describe('describeRecontact', () => {
    it('flags past dates as late', () => {
        expect(describeRecontact(null)).toBeNull();
        expect(describeRecontact('2000-01-01')?.late).toBe(true);
        expect(describeRecontact('2999-01-01')).toEqual(
            expect.objectContaining({ late: false }),
        );
    });
});

describe('LeadRecontact', () => {
    it('plans a recontact from the popover', async () => {
        const user = userEvent.setup();
        render(<LeadRecontact lead={makeLeadDetail()} channels={channels} />);

        expect(screen.getByText('Aucun recontact prévu')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Planifier' }));
        expect(
            await screen.findByRole('button', { name: 'Enregistrer' }),
        ).toBeDisabled();

        await user.click(screen.getByRole('combobox', { name: 'Canal' }));
        await user.click(
            await screen.findByRole('option', { name: 'WhatsApp' }),
        );
        // Date picker shadcn : un bouton de largeur fixe ouvre le calendrier du mois courant.
        const trigger = screen.getByRole('button', { name: 'Date' });
        expect(trigger).toHaveTextContent('Choisir une date');
        expect(trigger).toHaveClass('w-48');
        await user.click(trigger);
        const today = new Date();
        const fifteenth = new Date(today.getFullYear(), today.getMonth(), 15);
        await user.click(
            await screen.findByRole('button', {
                name: new RegExp(
                    format(fifteenth, 'EEEE d MMMM yyyy', { locale: fr }),
                    'i',
                ),
            }),
        );
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/recontact',
            {
                recontact_at: format(fifteenth, 'yyyy-MM-dd'),
                recontact_channel: 'whatsapp',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('clears a planned recontact', async () => {
        const user = userEvent.setup();
        render(
            <LeadRecontact
                lead={makeLeadDetail({
                    recontact_channel: 'phone',
                    recontact_channel_label: 'Téléphone',
                    recontact_at: '2030-01-15',
                })}
                channels={channels}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Reporter' }));
        await user.click(
            await screen.findByRole('button', { name: 'Effacer' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/recontact',
            { recontact_at: null, recontact_channel: null },
            expect.anything(),
        );
    });
});
