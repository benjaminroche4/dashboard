import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupAgents, LeadAgentCard } from '@/components/leads/lead-agent-card';
import { makeLeadDetail } from '@/test/fixtures/lead';

const patch = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: { patch: (...args: unknown[]) => patch(...args) },
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

const agents = [
    {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000b1',
        name: 'Zoé Martin',
        agency: 'Agence du Marais',
        phone: '+33 6 12 34 56 78',
        is_favorite: false,
    },
    {
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000b2',
        name: 'Ali Bensaïd',
        agency: null,
        phone: null,
        is_favorite: false,
    },
    {
        id: 3,
        uuid: '0199a9a0-0000-7000-8000-0000000000b3',
        name: 'Paul Roux',
        agency: 'Bureau Paris Ouest',
        phone: null,
        is_favorite: false,
    },
];

describe('groupAgents', () => {
    it('puts the favorites of the member in a first group, kept in their agency too', () => {
        const groups = groupAgents([
            { ...agents[0]!, is_favorite: true },
            agents[1]!,
            agents[2]!,
        ]);

        expect(groups.map((group) => group.label)).toEqual([
            'Favoris',
            'Agence du Marais',
            'Bureau Paris Ouest',
            'Indépendants',
        ]);
        expect(groups[0]!.agents.map((agent) => agent.name)).toEqual([
            'Zoé Martin',
        ]);
        expect(groups[1]!.agents.map((agent) => agent.name)).toEqual([
            'Zoé Martin',
        ]);
    });

    it('groups by agency, alphabetically, independents last', () => {
        expect(
            groupAgents(agents).map((group) => [
                group.label,
                group.agents.length,
            ]),
        ).toEqual([
            ['Agence du Marais', 1],
            ['Bureau Paris Ouest', 1],
            ['Indépendants', 1],
        ]);
    });
});

describe('LeadAgentCard', () => {
    beforeEach(() => patch.mockReset());

    it('shows the empty state and sets an agent from the directory', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail({ agent: null });
        render(<LeadAgentCard lead={lead} agents={agents} />);

        expect(
            screen.getByRole('region', { name: 'Agent en contact' }),
        ).toHaveTextContent('Aucun agent immobilier sur ce dossier.');
        await user.click(
            screen.getByRole('combobox', { name: 'Choisir un agent' }),
        );
        await user.click(screen.getByRole('option', { name: 'Zoé Martin' }));

        expect(patch).toHaveBeenCalledWith(
            `/locataires/${lead.uuid}/agent`,
            { agent_id: 1 },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the current agent with contact links and removes it', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail({
            agent: {
                id: 1,
                uuid: '0199a9a0-0000-7000-8000-0000000000b1',
                name: 'Zoé Martin',
                agency: 'Agence du Marais',
                position: 'Négociatrice',
                phone: '+33 6 12 34 56 78',
                email: 'zoe@marais.fr',
            },
        });
        render(<LeadAgentCard lead={lead} agents={agents} />);

        const card = screen.getByRole('region', { name: 'Agent en contact' });
        expect(
            within(card).getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
        );
        expect(card).toHaveTextContent('Agence du Marais · Négociatrice');
        expect(screen.getByRole('link', { name: 'Appeler' })).toHaveAttribute(
            'href',
            'tel:+33612345678',
        );
        expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/33612345678',
        );
        expect(screen.getByRole('link', { name: 'E-mail' })).toHaveAttribute(
            'href',
            'mailto:zoe@marais.fr',
        );

        await user.click(
            screen.getByRole('button', { name: 'Retirer l’agent' }),
        );
        expect(patch).toHaveBeenCalledWith(
            `/locataires/${lead.uuid}/agent`,
            { agent_id: null },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
