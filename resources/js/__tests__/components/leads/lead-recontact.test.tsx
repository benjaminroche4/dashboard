import { render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, post } = vi.hoisted(() => ({
    patch: vi.fn(),
    post: vi.fn(),
}));
vi.mock('@inertiajs/react', () => ({ router: { patch, post } }));
const { loading } = vi.hoisted(() => ({ loading: vi.fn(() => 'toast') }));
vi.mock('@/lib/toast', () => ({
    notify: { loading, resolve: vi.fn(), reject: vi.fn() },
}));

import {
    LeadRecontact,
    describeRecontact,
} from '@/components/leads/lead-recontact';
import { makeLeadDetail } from '@/test/fixtures/lead';

const channels = [
    { value: 'phone' as const, label: 'Téléphone' },
    { value: 'whatsapp' as const, label: 'WhatsApp' },
    { value: 'visio' as const, label: 'Visio' },
];

/** Choisit le 15 du mois prochain dans le calendrier ouvert : toujours dans le futur. */
async function pickNextMonthFifteenth(
    user: ReturnType<typeof userEvent.setup>,
): Promise<Date> {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    await user.click(
        await screen.findByRole('button', { name: /next month|mois suivant/i }),
    );
    await user.click(
        await screen.findByRole('button', {
            name: new RegExp(
                format(target, 'EEEE d MMMM yyyy', { locale: fr }),
                'i',
            ),
        }),
    );

    return target;
}

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
        // Chaque canal porte son pictogramme.
        const whatsapp = await screen.findByRole('option', {
            name: 'WhatsApp',
        });
        expect(whatsapp.querySelector('svg')).not.toBeNull();
        await user.click(whatsapp);
        // La planification s'ouvre dans une modale, pas un popover.
        expect(
            screen.getByRole('dialog', {
                name: 'Planifier le prochain recontact',
            }),
        ).toBeInTheDocument();
        // Date picker shadcn : un bouton ouvre le calendrier du mois courant.
        const trigger = screen.getByRole('button', { name: 'Date' });
        expect(trigger).toHaveTextContent('Choisir une date');
        await user.click(trigger);
        const fifteenth = await pickNextMonthFifteenth(user);
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/recontact',
            {
                recontact_at: `${format(fifteenth, 'yyyy-MM-dd')}T10:00`,
                recontact_channel: 'whatsapp',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('asks for a time and schedules the video call when the channel is visio', async () => {
        patch.mockClear();
        const user = userEvent.setup();
        render(<LeadRecontact lead={makeLeadDetail()} channels={channels} />);

        await user.click(screen.getByRole('button', { name: 'Planifier' }));
        await user.click(
            await screen.findByRole('combobox', { name: 'Canal' }),
        );
        await user.click(await screen.findByRole('option', { name: 'Visio' }));

        // Le créneau apparaît, avec 10:00 par défaut, et le bouton dit ce qu'il fait.
        expect(
            screen.getByRole('combobox', { name: 'Heure' }),
        ).toHaveTextContent('10:00');
        // La note dit tout ce que le bouton engage : l'agenda du responsable et l'e-mail au client.
        const note = screen.getByRole('note');
        expect(note).toHaveClass('bg-sidebar');
        expect(note).toHaveTextContent(
            /agenda de .+, avec le lien Google Meet/,
        );
        expect(note).toHaveTextContent(
            'invitation sera envoyée à lea@example.com',
        );
        const submit = screen.getByRole('button', {
            name: 'Programmer la visio',
        });
        expect(submit).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Date' }));
        const fifteenth = await pickNextMonthFifteenth(user);
        await user.click(submit);

        // Pas un simple rappel : l'appel vidéo est programmé, invitation comprise.
        expect(patch).not.toHaveBeenCalled();
        expect(post).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/visio',
            { visio_at: `${format(fifteenth, 'yyyy-MM-dd')}T10:00` },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the time of a planned recontact', () => {
        render(
            <LeadRecontact
                lead={makeLeadDetail({
                    recontact_channel: 'visio',
                    recontact_channel_label: 'Visio',
                    recontact_at: '2030-01-15T10:00:00+01:00',
                })}
                channels={channels}
            />,
        );

        expect(
            screen.getByText(/Visio · .*15 janv\. 2030 à 10:00/),
        ).toBeInTheDocument();
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
