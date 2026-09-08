import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    LeadInboundMessage,
    whatsAppUrl,
} from '@/components/leads/lead-inbound-message';
import { makeInbound, makeLeadDetail } from '@/test/fixtures/lead';

const patch = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: { patch: (...args: unknown[]) => patch(...args) },
    usePage: () => ({ props: { auth: { user: { id: 7 } } } }),
}));

vi.mock('@/lib/toast', () => ({
    notify: { success: vi.fn(), error: vi.fn() },
}));

describe('whatsAppUrl', () => {
    it('keeps only the digits of the phone number', () => {
        expect(whatsAppUrl('+33 6 12 34 56 78')).toBe(
            'https://wa.me/33612345678',
        );
    });
});

describe('LeadInboundMessage', () => {
    beforeEach(() => patch.mockReset());

    it('shows the message with reply links and claims the lead for me', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail({
            status: 'todo',
            email: 'lea@example.com',
            phone: '+33 6 12 34 56 78',
        });
        render(<LeadInboundMessage lead={lead} inbound={makeInbound()} />);

        expect(
            screen.getByRole('region', { name: 'Message reçu depuis le site' }),
        ).toHaveTextContent("j'arrive à Paris en octobre");
        expect(
            screen.getByRole('link', { name: 'Répondre par e-mail' }),
        ).toHaveAttribute('href', 'mailto:lea@example.com');
        expect(screen.getByRole('link', { name: 'Appeler' })).toHaveAttribute(
            'href',
            'tel:+33612345678',
        );
        expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/33612345678',
        );

        await user.click(
            screen.getByRole('button', { name: 'Je m’en occupe' }),
        );

        expect(patch).toHaveBeenCalledWith(
            `/locataires/${lead.uuid}/assign`,
            { user_id: 7 },
            expect.objectContaining({ preserveScroll: true }),
        );
        // Une fois attribué, le lead passe en « En cours ».
        const options = patch.mock.calls[0]?.[2] as { onSuccess: () => void };
        options.onSuccess();
        expect(patch).toHaveBeenLastCalledWith(
            `/locataires/${lead.uuid}/status`,
            { status: 'in_progress' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('labels calls and SMS and hides links without contact details', () => {
        const lead = makeLeadDetail({
            status: 'todo',
            email: null,
            phone: null,
        });
        render(
            <LeadInboundMessage
                lead={lead}
                inbound={makeInbound({
                    kind: 'sms',
                    meta: 'SMS reçu',
                    body: 'Dispo demain ?',
                })}
            />,
        );

        expect(
            screen.getByRole('region', { name: 'SMS reçu' }),
        ).toHaveTextContent('Dispo demain ?');
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
