import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { post, notify } = vi.hoisted(() => ({
    post: vi.fn(),
    notify: { success: vi.fn() },
}));

vi.mock('@inertiajs/react', () => ({ router: { post } }));
vi.mock('@/lib/toast', () => ({ notify }));

import { LeadVisioReportDialog } from '@/components/leads/lead-visio-report-dialog';
import { makeLeadDetail } from '@/test/fixtures/lead';

describe('LeadVisioReportDialog', () => {
    beforeEach(() => post.mockReset());
    afterEach(() => window.history.replaceState({}, '', '/'));

    it('renders nothing without a scheduled call, and nothing due before it', () => {
        const { rerender } = render(
            <LeadVisioReportDialog lead={makeLeadDetail({ visio_at: null })} />,
        );
        expect(screen.queryByText(/Compte rendu/)).toBeNull();

        rerender(
            <LeadVisioReportDialog
                lead={makeLeadDetail({
                    visio_at: '2030-03-20T14:30:00+01:00',
                    visio_report_due: false,
                })}
            />,
        );
        expect(screen.queryByText(/Compte rendu/)).toBeNull();
    });

    it('flags a past call without report and posts the report after local validation', async () => {
        const user = userEvent.setup();
        render(
            <LeadVisioReportDialog
                lead={makeLeadDetail({
                    visio_at: '2026-09-01T14:30:00+02:00',
                    visio_report_due: true,
                })}
            />,
        );

        expect(screen.getByText('Compte rendu à rédiger')).toHaveAttribute(
            'data-visio-report',
            'due',
        );
        await user.click(
            screen.getByRole('button', { name: 'Rédiger le compte rendu' }),
        );
        const dialog = within(
            await screen.findByRole('dialog', {
                name: 'Compte rendu de l’appel vidéo avec Léa Durand',
            }),
        );
        await user.click(
            dialog.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );
        expect(post).not.toHaveBeenCalled();
        expect(dialog.getByText(/au moins 10 caractères/)).toBeInTheDocument();

        await user.type(
            dialog.getByLabelText('Compte rendu'),
            'Budget confirmé, visite souhaitée la semaine prochaine.',
        );
        await user.click(
            dialog.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/visio/report',
            {
                report: 'Budget confirmé, visite souhaitée la semaine prochaine.',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the written report state and opens directly from the e-mail link', async () => {
        window.history.replaceState({}, '', '/locataires/x?report=visio');
        render(
            <LeadVisioReportDialog
                lead={makeLeadDetail({
                    visio_at: '2026-09-01T14:30:00+02:00',
                    visio_report: 'Appel positif.',
                    visio_report_submitted_at: '2026-09-01T16:00:00+02:00',
                    visio_report_due: false,
                })}
            />,
        );

        expect(screen.getByText('Compte rendu rédigé')).toHaveAttribute(
            'data-visio-report',
            'done',
        );
        // Le dialogue est déjà ouvert (lien de l'e-mail) : le reste de la page est masqué aux lecteurs d'écran.
        expect(
            screen.getByRole('button', {
                name: 'Modifier le compte rendu',
                hidden: true,
            }),
        ).toBeInTheDocument();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByLabelText('Compte rendu')).toHaveValue(
            'Appel positif.',
        );
    });
});
