import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: vi.fn() },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, string>) => useFormStub(initial),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string } | string;
        children: ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

function useFormStub(initial: Record<string, string>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, string>, value?: string) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value ?? '' }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        post: vi.fn(),
        patch,
    };
}

import AgentShow from '@/pages/real-estate/agent';
import { agencyOptions, makeAgent } from '@/test/fixtures/real-estate';

describe('Agent detail page', () => {
    it('shows contact, agency link, leads and opens the edit dialog', async () => {
        const user = userEvent.setup();
        render(
            <AgentShow
                agent={makeAgent({
                    street: '5 rue de Bretagne',
                    postal_code: '75003',
                    city: 'Paris',
                    notes: 'Très réactive.',
                    leads: [
                        {
                            uuid: 'abc',
                            name: 'Léa Durand',
                            status_label: 'En cours',
                        },
                    ],
                })}
                agency={{
                    id: 1,
                    uuid: '0199a9a0-0000-7000-8000-0000000000a1',
                    name: 'Agence du Marais',
                    street: '12 rue de Turenne',
                    postal_code: '75003',
                    city: 'Paris',
                    phone: '+33 1 42 00 00 00',
                    email: 'contact@marais.example',
                    website: 'https://marais.example',
                    agents_count: 2,
                }}
                agencies={agencyOptions}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Zoé Martin' }),
        ).toBeInTheDocument();
        const agencyCard = within(
            screen.getByRole('region', { name: 'Agence' }),
        );
        expect(
            agencyCard.getByText('12 rue de Turenne, 75003 Paris'),
        ).toBeInTheDocument();
        expect(agencyCard.getByText('2 agent(s)')).toBeInTheDocument();
        expect(
            agencyCard.getByRole('link', { name: '+33 1 42 00 00 00' }),
        ).toHaveAttribute('href', 'tel:+33142000000');
        expect(
            agencyCard.getByRole('link', { name: 'Voir la fiche de l’agence' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agencies/0199a9a0-0000-7000-8000-0000000000a1',
        );
        expect(
            screen.getAllByRole('link', { name: 'Agence du Marais' })[0],
        ).toHaveAttribute(
            'href',
            '/real-estate/agencies/0199a9a0-0000-7000-8000-0000000000a1',
        );
        expect(
            screen.getByText('5 rue de Bretagne, 75003 Paris'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/33612345678',
        );
        expect(screen.getByText('Très réactive.')).toBeInTheDocument();
        const leads = within(
            screen.getByRole('region', { name: 'Leads en contact' }),
        );
        expect(leads.getByRole('link', { name: 'Léa Durand' })).toHaveAttribute(
            'href',
            '/leads/abc',
        );
        expect(
            screen.getByRole('link', { name: 'Tous les agents' }),
        ).toHaveAttribute('href', '/real-estate/agents');

        await user.click(screen.getByRole('button', { name: 'Modifier' }));
        const dialog = screen.getByRole('dialog', {
            name: 'Modifier Zoé Martin',
        });
        await user.click(
            within(dialog).getByRole('button', { name: 'Enregistrer' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
            expect.anything(),
        );
    });

    it('marks an independent agent and the empty states', () => {
        render(
            <AgentShow
                agent={makeAgent({
                    agency: null,
                    notes: null,
                    email: null,
                    phone: null,
                })}
                agency={null}
                agencies={[]}
            />,
        );

        expect(
            screen.queryByRole('region', { name: 'Agence' }),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Indépendant')).toBeInTheDocument();
        expect(screen.getByText('Aucune note.')).toBeInTheDocument();
        expect(
            screen.getByText(/Aucun lead ne lui est rattaché/),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Non renseigné')).toHaveLength(3);
    });
});
