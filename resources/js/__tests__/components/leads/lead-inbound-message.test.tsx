import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LeadInboundMessage } from '@/components/leads/lead-inbound-message';
import { makeInbound, makeLeadDetail } from '@/test/fixtures/lead';

describe('LeadInboundMessage', () => {
    it('shows the message without any reply or claim button', () => {
        const lead = makeLeadDetail({
            status: 'todo',
            email: 'lea@example.com',
            phone: '+33 6 12 34 56 78',
        });
        render(<LeadInboundMessage lead={lead} inbound={makeInbound()} />);

        const region = screen.getByRole('region', {
            name: 'Message reçu depuis le site',
        });
        expect(region).toHaveTextContent("j'arrive à Paris en octobre");
        // Plus de ligne « Formulaire de contact · … · CT-… · date » : le type
        // de demande s'écrit en tête du message, sur sa propre ligne.
        expect(region).not.toHaveTextContent('CT-4F2A11');
        expect(region).not.toHaveTextContent('Formulaire de contact');
        const quote = region.querySelector('blockquote');
        // Le sujet sur sa propre ligne, à distance du message (`gap-2`) ;
        // seul « Topic : » est en gras, le sujet reste en texte courant.
        expect(quote).toHaveClass('gap-2');
        const topic = screen.getByTestId('lead-inbound-topic');
        expect(topic).toHaveTextContent('Topic : Recherche de logement');
        expect(topic.querySelector('.font-semibold')?.textContent).toBe(
            'Topic :',
        );
        expect(topic.nextElementSibling).toHaveTextContent(
            "Bonjour, j'arrive à Paris en octobre avec ma famille.",
        );
        // Les coordonnées se lisent dans la colonne de gauche et
        // l'attribution dans « Suivi par » : la carte ne porte aucun bouton.
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Je m’en occupe' }),
        ).not.toBeInTheDocument();
    });

    it('labels calls and SMS and shows no link', () => {
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
                    topic: null,
                })}
            />,
        );

        const region = screen.getByRole('region', { name: 'SMS reçu' });
        expect(region).toHaveTextContent('Dispo demain ?');
        // Un échange téléphonique garde sa ligne de provenance, sans « Topic ».
        expect(region).toHaveTextContent('SMS reçu');
        expect(region).not.toHaveTextContent('Topic');
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('opens by default whatever the status, and remembers being folded across a reload', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail({ status: 'in_progress', uuid: 'lead-9' });
        const { unmount } = render(
            <LeadInboundMessage lead={lead} inbound={makeInbound()} />,
        );

        const block = screen.getByTestId('lead-inbound');
        expect(block).toHaveAttribute('data-state', 'open');
        await user.click(screen.getByRole('button', { name: 'Replier' }));
        expect(block).toHaveAttribute('data-state', 'collapsed');
        expect(localStorage.getItem('dashboard.lead.lead-9.inbound')).toBe(
            'false',
        );

        // Un rechargement retrouve la carte telle qu'on l'a laissée.
        unmount();
        render(<LeadInboundMessage lead={lead} inbound={makeInbound()} />);
        expect(screen.getByTestId('lead-inbound')).toHaveAttribute(
            'data-state',
            'collapsed',
        );
        expect(
            screen.getByRole('button', { name: 'Afficher' }),
        ).toBeInTheDocument();
    });
});
