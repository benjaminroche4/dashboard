import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    LeadSendDialog,
    sendChoices,
} from '@/components/leads/lead-send-dialog';
import { makeLeadDetail } from '@/test/fixtures/lead';

const lead = makeLeadDetail({
    email: 'lea@example.com',
    offer_label: 'Confié',
});

describe('sendChoices', () => {
    it('explains why a link is unavailable', () => {
        const choices = sendChoices(lead, {
            email: true,
            paymentLink: false,
            contractLink: true,
            paymentPlans: [],
        });

        expect(choices.map((c) => c.unavailable)).toEqual([
            null,
            'Aucun lien de paiement configuré.',
            null,
        ]);
        expect(
            sendChoices(
                { ...lead, offer_label: null },
                {
                    email: true,
                    paymentLink: true,
                    contractLink: true,
                    paymentPlans: [],
                },
            ).map((c) => c.unavailable),
        ).toEqual([
            null,
            'Choisissez d’abord une formule.',
            'Choisissez d’abord une formule.',
        ]);
    });
});

describe('LeadSendDialog', () => {
    beforeEach(() => {
        post.mockReset();
        notify.loading.mockClear();
        notify.resolve.mockClear();
        notify.reject.mockClear();
    });

    it('opens a modal with the recap checked and posts the chosen items', async () => {
        const user = userEvent.setup();
        render(
            <LeadSendDialog
                lead={lead}
                sending={{
                    email: true,
                    paymentLink: true,
                    contractLink: false,
                    paymentPlans: [
                        {
                            value: 'full',
                            label: 'Sans acompte, paiement en totalité',
                        },
                        { value: 'deposit', label: 'Acompte de 50 %' },
                    ],
                }}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Envoyer au lead' }),
        );

        expect(
            await screen.findByRole('dialog', { name: 'Envoyer au lead' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', { name: /Récapitulatif du dossier/ }),
        ).toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: /Lien du contrat/ }),
        ).toBeDisabled();
        expect(
            screen.getByText('Yousign ou DocRaptor n’est pas configuré.'),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole('radiogroup', { name: 'Modalité de paiement' }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('checkbox', { name: /Lien de paiement/ }),
        );
        // La modalité n'apparaît qu'avec le lien de paiement, pour Confié,
        // avec l'acompte de 50 % coché par défaut.
        expect(
            screen.getByRole('radio', { name: 'Acompte de 50 %' }),
        ).toBeChecked();
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        expect(post).toHaveBeenCalledWith(
            '/leads/1/send',
            { items: ['recap', 'payment_link'], payment_plan: 'deposit' },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(notify.loading).toHaveBeenCalled();
    });

    it('blocks the send button when nothing sendable is checked', async () => {
        const user = userEvent.setup();
        render(
            <LeadSendDialog
                lead={lead}
                sending={{
                    email: true,
                    paymentLink: false,
                    contractLink: false,
                    paymentPlans: [],
                }}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Envoyer au lead' }),
        );
        await user.click(
            screen.getByRole('checkbox', { name: /Récapitulatif du dossier/ }),
        );

        expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    });

    it('is disabled when the lead has no e-mail', () => {
        render(
            <LeadSendDialog
                lead={{ ...lead, email: null }}
                sending={{
                    email: false,
                    paymentLink: true,
                    contractLink: true,
                    paymentPlans: [],
                }}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Envoyer au lead' }),
        ).toBeDisabled();
    });
});
