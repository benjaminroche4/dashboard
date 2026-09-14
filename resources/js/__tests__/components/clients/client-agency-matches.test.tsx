import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { routerPatch, askAssistant } = vi.hoisted(() => ({
    routerPatch: vi.fn(),
    askAssistant: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { patch: routerPatch, post: vi.fn(), delete: vi.fn() },
    usePage: () => ({
        props: {
            features: { assistant: true },
            auth: { user: { id: 1 }, access: null },
        },
    }),
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
    useForm: () => ({
        data: { email: '', message: '' },
        errors: {},
        processing: false,
        setData: vi.fn(),
        clearErrors: vi.fn(),
        transform: vi.fn(),
        post: vi.fn(),
    }),
}));
vi.mock('@/lib/assistant-request', () => ({ askAssistant }));

import {
    ClientAgencyMatches,
    orderSuggestions,
} from '@/components/clients/client-agency-matches';
import { makeClientAgentSuggestion } from '@/test/fixtures/client';

describe('ClientAgencyMatches', () => {
    it('lists the agencies with their reasons and best agent, and picks the agent for the dossier', async () => {
        const user = userEvent.setup();
        render(
            <ClientAgencyMatches
                clientUuid="client-1"
                currentAgentId={null}
                districts={[11]}
                suggestions={[
                    makeClientAgentSuggestion(),
                    makeClientAgentSuggestion({
                        key: 'agent:9',
                        agency: null,
                        score: 4,
                        reasons: ['Des biens dans les quartiers voisins'],
                        best_agent: {
                            ...makeClientAgentSuggestion().best_agent!,
                            id: 9,
                            uuid: 'agent-9',
                            name: 'Léo Petit',
                            position: null,
                            relationship_quality_label: null,
                        },
                    }),
                ]}
            />,
        );

        const card = screen.getByRole('region', {
            name: 'Agences à contacter',
        });
        const rows = within(card)
            .getAllByRole('listitem')
            .filter(
                (item) =>
                    item.tagName === 'LI' &&
                    item.classList.contains('bg-background'),
            );
        expect(rows).toHaveLength(2);
        expect(
            within(rows[0]!).getByRole('link', { name: 'Oberkampf Immo' }),
        ).toHaveAttribute('href', expect.stringContaining('agencies'));
        expect(within(rows[0]!).getByText('14 pts')).toBeInTheDocument();
        expect(
            within(rows[0]!).getByText('2 biens dans les quartiers visés'),
        ).toBeInTheDocument();
        expect(within(rows[0]!).getByText(/Agent conseillé/)).toHaveTextContent(
            'Zoé Martin · Négociatrice · relation excellente',
        );
        expect(within(rows[1]!).getByText('Indépendant')).toBeInTheDocument();

        await user.click(
            within(rows[0]!).getByRole('button', { name: 'Choisir cet agent' }),
        );
        expect(routerPatch).toHaveBeenCalledWith(
            expect.stringContaining('client-1'),
            { agent_id: 7 },
            expect.anything(),
        );
    });

    it('refines with the assistant: reorders and shows the fit and the reason', async () => {
        const user = userEvent.setup();
        askAssistant.mockResolvedValueOnce({
            ranking: ['agent:9', 'agency:3'],
            explanations: [
                { key: 'agency:3', fit: 'weak', reason: 'Trop cher.' },
                { key: 'agent:9', fit: 'strong', reason: 'Le bon quartier.' },
            ],
        });
        render(
            <ClientAgencyMatches
                clientUuid="client-1"
                currentAgentId={7}
                districts={[11]}
                suggestions={[
                    makeClientAgentSuggestion(),
                    makeClientAgentSuggestion({
                        key: 'agent:9',
                        agency: null,
                        best_agent: {
                            ...makeClientAgentSuggestion().best_agent!,
                            id: 9,
                            uuid: 'agent-9',
                            name: 'Léo Petit',
                        },
                    }),
                ]}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Agent du dossier' }),
        ).toBeDisabled();
        await user.click(
            screen.getByRole('button', { name: 'Affiner avec l’IA' }),
        );

        expect(await screen.findByText('Le bon quartier.')).toBeInTheDocument();
        const names = screen
            .getAllByRole('link')
            .map((link) => link.textContent)
            .filter(
                (text) => text === 'Léo Petit' || text === 'Oberkampf Immo',
            );
        expect(names[0]).toBe('Léo Petit');
        expect(screen.getByText('À contacter en premier')).toBeInTheDocument();
        expect(screen.getByText('En réserve')).toBeInTheDocument();
    });

    it('says what to do when nothing comes out', () => {
        render(
            <ClientAgencyMatches
                clientUuid="client-1"
                currentAgentId={null}
                districts={[]}
                suggestions={[]}
            />,
        );

        expect(
            screen.getByText(/Aucune agence de l’annuaire ne ressort/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Trouver d’autres agences' }),
        ).toBeInTheDocument();
    });

    it('orders by the assistant ranking, forgotten keys last', () => {
        const a = makeClientAgentSuggestion({ key: 'a' });
        const b = makeClientAgentSuggestion({ key: 'b' });
        const c = makeClientAgentSuggestion({ key: 'c' });

        expect(orderSuggestions([a, b, c], []).map((s) => s.key)).toEqual([
            'a',
            'b',
            'c',
        ]);
        expect(
            orderSuggestions([a, b, c], ['c', 'a']).map((s) => s.key),
        ).toEqual(['c', 'a', 'b']);
    });
});
