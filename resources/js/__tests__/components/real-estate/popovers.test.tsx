import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AgencyAgentsPopover } from '@/components/real-estate/agency-agents-popover';
import { AgentLeadsPopover } from '@/components/real-estate/agent-leads-popover';
import { ContactDuplicatesAlert } from '@/components/real-estate/contact-duplicates-alert';
import { makeAgency, makeAgent } from '@/test/fixtures/real-estate';

vi.mock('@inertiajs/react', () => ({
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

describe('AgencyAgentsPopover', () => {
    it('lists the agents with phone and offers to add one for this agency', async () => {
        const user = userEvent.setup();
        const onAddAgent = vi.fn();
        const agency = makeAgency();
        render(<AgencyAgentsPopover agency={agency} onAddAgent={onAddAgent} />);

        await user.click(
            screen.getByRole('button', {
                name: '2 agent(s) de Agence du Marais',
            }),
        );
        expect(
            screen.getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
        );
        expect(
            screen.getByRole('link', { name: '+33 6 12 34 56 78' }),
        ).toHaveAttribute('href', 'tel:+33612345678');

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un agent' }),
        );
        expect(onAddAgent).toHaveBeenCalledWith(agency);
    });
});

describe('AgentLeadsPopover', () => {
    it('shows 0 without a popover, else the leads with links to their page', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<AgentLeadsPopover agent={makeAgent()} />);
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();

        rerender(
            <AgentLeadsPopover
                agent={makeAgent({
                    leads: [
                        {
                            uuid: 'abc',
                            name: 'Léa Durand',
                            status_label: 'En cours',
                        },
                    ],
                })}
            />,
        );
        await user.click(
            screen.getByRole('button', {
                name: '1 lead(s) suivi(s) par Zoé Martin',
            }),
        );
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/leads/abc');
        expect(screen.getByText('En cours')).toBeInTheDocument();
    });
});

describe('ContactDuplicatesAlert', () => {
    it('renders nothing without hits and a warning listing them otherwise', () => {
        const { rerender } = render(
            <ContactDuplicatesAlert duplicates={[]} noun="agent" />,
        );
        expect(
            screen.queryByTestId('contact-duplicates'),
        ).not.toBeInTheDocument();

        rerender(
            <ContactDuplicatesAlert
                noun="agence"
                duplicates={[
                    {
                        id: 1,
                        uuid: '0199a9a0-0000-7000-8000-0000000000a1',
                        name: 'Agence du Marais',
                        email: 'contact@marais.fr',
                        phone: null,
                    },
                ]}
            />,
        );
        const alert = screen.getByTestId('contact-duplicates');
        expect(alert).toHaveTextContent(
            'Une agence existe déjà avec ce contact',
        );
        expect(alert).toHaveTextContent('Agence du Marais · contact@marais.fr');
    });
});
