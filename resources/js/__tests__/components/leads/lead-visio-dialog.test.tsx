import { render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { post, notify } = vi.hoisted(() => ({
    post: vi.fn(),
    notify: {
        loading: vi.fn(() => 'toast-1'),
        resolve: vi.fn(),
        reject: vi.fn(),
    },
}));

vi.mock('@inertiajs/react', () => ({ router: { post } }));
vi.mock('@/lib/toast', () => ({ notify }));

import {
    LeadVisioDialog,
    defaultSlot,
    toLocalInput,
} from '@/components/leads/lead-visio-dialog';
import { makeLeadDetail } from '@/test/fixtures/lead';

/** Nom accessible d'un jour du calendrier, ex. « mercredi 20 mars 2030 ». */
const dayName = (year: number, month: number, day: number): RegExp =>
    new RegExp(
        format(new Date(year, month, day), 'EEEE d MMMM yyyy', { locale: fr }),
        'i',
    );

describe('defaultSlot', () => {
    it('proposes the next working day at 10:00', () => {
        expect(defaultSlot(new Date('2026-09-04T15:00:00'))).toBe(
            '2026-09-07T10:00',
        ); // vendredi → lundi
        expect(defaultSlot(new Date('2026-09-08T09:00:00'))).toBe(
            '2026-09-09T10:00',
        );
        expect(toLocalInput(new Date('2026-09-08T09:05:00'))).toBe(
            '2026-09-08T09:05',
        );
    });
});

describe('LeadVisioDialog', () => {
    beforeEach(() => {
        post.mockReset();
        notify.loading.mockClear();
        // Horloge décalée (Date seulement, qui continue d'avancer) : lundi 11 mars 2030 à 10h00.
        vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
        vi.setSystemTime(new Date(2030, 2, 11, 10, 0, 0));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('opens the modal, lets the user pick a date and posts it', async () => {
        const user = userEvent.setup();
        render(
            <LeadVisioDialog
                lead={makeLeadDetail({
                    email: 'lea@example.com',
                    first_name: 'Léa',
                })}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Programmer une visio' }),
        );
        expect(
            await screen.findByRole('dialog', { name: 'Programmer une visio' }),
        ).toBeInTheDocument();

        // Date picker shadcn (bouton de largeur fixe + calendrier) et champ heure.
        const dateButton = screen.getByRole('button', { name: 'Date' });
        expect(dateButton).toHaveClass('w-48');
        await user.click(dateButton);
        await user.click(
            await screen.findByRole('button', { name: dayName(2030, 2, 20) }),
        );
        await user.click(
            screen.getByRole('combobox', { name: 'Heure (Paris)' }),
        );
        await user.click(await screen.findByRole('option', { name: '14:30' }));
        await user.click(
            screen.getByRole('button', { name: "Envoyer l'invitation" }),
        );

        expect(post).toHaveBeenCalledWith(
            '/leads/0199a9a0-0000-7000-8000-000000000001/visio',
            { visio_at: '2030-03-20T14:30' },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(notify.loading).toHaveBeenCalled();
    });

    it('refuses a past date locally', async () => {
        const user = userEvent.setup();
        render(
            <LeadVisioDialog
                lead={makeLeadDetail({ email: 'lea@example.com' })}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Programmer une visio' }),
        );
        // Les jours passés sont grisés ; aujourd'hui avec une heure déjà passée est refusé.
        await user.click(screen.getByRole('button', { name: 'Date' }));
        expect(
            await screen.findByRole('button', {
                name: dayName(2030, 2, 10),
            }),
        ).toBeDisabled();
        await user.click(
            screen.getByRole('button', { name: dayName(2030, 2, 11) }),
        );
        await user.click(
            screen.getByRole('combobox', { name: 'Heure (Paris)' }),
        );
        await user.click(await screen.findByRole('option', { name: '08:00' }));
        await user.click(
            screen.getByRole('button', { name: "Envoyer l'invitation" }),
        );

        expect(post).not.toHaveBeenCalled();
        expect(
            screen.getByText('Choisissez une date dans le futur.'),
        ).toBeInTheDocument();
    });

    it('shows the scheduled call with its Meet link and offers to move it', () => {
        render(
            <LeadVisioDialog
                lead={makeLeadDetail({
                    email: 'lea@example.com',
                    visio_at: '2026-10-14T12:30:00+00:00',
                    visio_meet_link: 'https://meet.google.com/abc-defg-hij',
                })}
            />,
        );

        expect(
            document.querySelector('[data-test="visio-summary"]'),
        ).toHaveTextContent(/14 octobre.*14:30/);
        expect(
            screen.getByRole('link', { name: 'Rejoindre sur Google Meet' }),
        ).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
        expect(
            screen.getByRole('button', { name: 'Déplacer la visio' }),
        ).toBeInTheDocument();
    });

    it('is disabled without an e-mail', () => {
        render(<LeadVisioDialog lead={makeLeadDetail({ email: null })} />);

        expect(
            screen.getByRole('button', { name: 'Programmer une visio' }),
        ).toBeDisabled();
    });
});
