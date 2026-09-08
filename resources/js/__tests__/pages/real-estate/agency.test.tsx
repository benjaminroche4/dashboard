import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: vi.fn() },
    usePage: () => ({
        props: {
            auth: { user: { role: 'member' } },
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
        patch: vi.fn(),
    };
}

import AgencyShow from '@/pages/real-estate/agency';
import { makeAgency } from '@/test/fixtures/real-estate';

const agency = {
    ...makeAgency(),
    agents: [
        {
            id: 1,
            uuid: '0199a9a0-0000-7000-8000-0000000000b1',
            name: 'Zoé Martin',
            position: 'Négociatrice',
            phone: '+33 6 12 34 56 78',
            email: null,
            leads_count: 1,
        },
        {
            id: 2,
            uuid: '0199a9a0-0000-7000-8000-0000000000b2',
            name: 'Paul Roux',
            position: null,
            phone: null,
            email: null,
            leads_count: 0,
        },
    ],
    leads: [
        {
            uuid: 'abc',
            name: 'Léa Durand',
            status_label: 'En cours',
            agent: 'Zoé Martin',
        },
    ],
};

describe('Agency detail page', () => {
    it('shows coordinates, agents with their lead count, leads via agents, and adds an agent preselected', async () => {
        const user = userEvent.setup();
        render(<AgencyShow agency={agency} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Agence du Marais' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Ajouter Agence du Marais aux favoris',
            }),
        ).toHaveAttribute('aria-pressed', 'false');
        expect(
            screen.getByText('12 rue de Turenne, 75003 Paris'),
        ).toBeInTheDocument();
        const agents = within(screen.getByRole('region', { name: 'Agents' }));
        expect(
            agents.getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
        );
        expect(agents.getByLabelText('1 lead(s)')).toBeInTheDocument();
        expect(agents.getByText('Fonction non renseignée')).toBeInTheDocument();
        const leads = within(
            screen.getByRole('region', { name: 'Leads en contact' }),
        );
        expect(leads.getByRole('link', { name: 'Léa Durand' })).toHaveAttribute(
            'href',
            '/locataires/abc',
        );
        expect(leads.getByText('via Zoé Martin')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un agent' }),
        );
        const dialog = screen.getByRole('dialog', { name: 'Nouvel agent' });
        expect(
            within(dialog).getByRole('combobox', { name: 'Agence' }),
        ).toHaveTextContent('Agence du Marais');

        // Membre : pas de suppression dans le menu.
        await user.click(
            within(dialog).getByRole('button', { name: 'Annuler' }),
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Actions pour Agence du Marais',
            }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Supprimer' }),
        ).not.toBeInTheDocument();
    });
});
