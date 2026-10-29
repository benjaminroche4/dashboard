import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: vi.fn(), post, patch },
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
            is_primary: false,
            is_favorite: false,
            position: 'Négociatrice',
            phone: '+33 6 12 34 56 78',
            email: null,
            leads_count: 1,
        },
        {
            id: 2,
            uuid: '0199a9a0-0000-7000-8000-0000000000b2',
            name: 'Paul Roux',
            is_primary: false,
            is_favorite: false,
            position: null,
            phone: null,
            email: null,
            leads_count: 0,
        },
    ],
    properties: [
        {
            uuid: 'property-1',
            label: 'T2 lumineux · 11e',
            photo: null,
            visits_count: 2,
            last_visit_at: '2026-09-08T10:00:00+00:00',
            last_visit_status: 'Effectuée',
            agent: 'Zoé Martin',
        },
    ],
};

describe('Agency detail page', () => {
    it('shows coordinates, agents, the properties visited with the agency, and adds an agent preselected', async () => {
        const user = userEvent.setup();
        render(<AgencyShow agency={agency} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Agence du Marais' }),
        ).toBeInTheDocument();
        // Pas un favori : aucune étoile.
        expect(screen.queryByRole('img', { name: 'Favori' })).toBeNull();
        // L'adresse tient sur une seule ligne modifiable en place : rue,
        // puis code postal et ville (28 octobre 2026).
        const contact = within(screen.getByRole('region', { name: 'Contact' }));
        expect(
            contact.getByText('12 rue de Turenne, 75003 Paris'),
        ).toBeInTheDocument();
        const agents = within(screen.getByRole('region', { name: 'Agents' }));
        expect(
            agents.getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute(
            'href',
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1',
        );
        // Le compte de leads ne s'affiche plus ici : il vit dans la liste des
        // agents et sur la fiche de l'agent, pas sur celle de l'agence.
        expect(agents.queryByText(/lead\(s\)/)).toBeNull();
        // Téléphone et e-mail cliquables, sur leur propre ligne (même carte que
        // les interlocuteurs d'un partenaire).
        expect(
            agents.getByRole('link', { name: '+33 6 12 34 56 78' }),
        ).toHaveAttribute('href', 'tel:+33612345678');
        // Sans fonction, la ligne disparaît plutôt que d'annoncer un vide.
        expect(agents.queryByText('Fonction non renseignée')).toBeNull();
        // Ce qui compte pour une agence : les biens qu'on a visités avec elle.
        const visited = within(
            screen.getByRole('region', { name: 'Biens visités' }),
        );
        expect(
            visited.getByRole('link', { name: 'T2 lumineux · 11e' }),
        ).toHaveAttribute('href', '/properties/property-1');
        expect(visited.getByText('2 visites')).toBeInTheDocument();
        expect(
            visited.getByText(
                /Dernière : 8 sept. 2026 · Effectuée · Zoé Martin/,
            ),
        ).toBeInTheDocument();

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

    it('stars an agent from the agency, and searches once the list is long', async () => {
        const user = userEvent.setup();
        const many = Array.from({ length: 8 }, (_, index) => ({
            id: index + 10,
            uuid: `agent-${index}`,
            name: index === 0 ? 'Zoé Martin' : `Agent ${index}`,
            position: index === 0 ? 'Négociatrice' : null,
            phone: null,
            email: null,
            is_primary: false,
            is_favorite: index === 0,
            leads_count: 0,
        }));
        render(<AgencyShow agency={{ ...agency, agents: many }} />);

        const card = within(screen.getByRole('region', { name: 'Agents' }));
        // Un favori se signale par l'étoile, à côté du nom.
        expect(card.getAllByRole('img', { name: 'Favori' })).toHaveLength(1);

        // La bascule vit dans le menu de la ligne, comme ailleurs.
        await user.click(
            card.getByRole('button', { name: 'Actions pour Zoé Martin' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: /Favoris/ }),
        );
        expect(post).toHaveBeenCalledWith(
            '/real-estate/agents/agent-0/favorite',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );

        // Huit agents : la recherche apparaît et réduit la liste.
        await user.type(
            card.getByRole('searchbox', { name: 'Rechercher un agent' }),
            'négo',
        );
        expect(card.getAllByRole('listitem')).toHaveLength(1);
        expect(card.getByText('Zoé Martin')).toBeInTheDocument();
    });

    it('shows the logo in the header as a tile that changes it, and the removal in the « ⋯ » menu', async () => {
        const user = userEvent.setup();
        render(
            <AgencyShow
                agency={{
                    ...agency,
                    logo: '/storage/agency-logos/marais.png',
                }}
            />,
        );

        const tile = screen.getByRole('button', { name: 'Changer le logo' });
        expect(tile.querySelector('img')).toHaveAttribute(
            'src',
            '/storage/agency-logos/marais.png',
        );

        await user.click(
            screen.getByRole('button', {
                name: /Actions pour Agence du Marais/,
            }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Retirer le logo' }),
        ).toBeInTheDocument();
    });

    it('follows the agent fiche: two columns, inline contact and a ruled matching profile edited line by line', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        // Avec une carte statique servie par le serveur : elle ne doit pas
        // s'afficher dans le bloc pour autant.
        render(
            <AgencyShow
                agency={{ ...agency, latitude: 48.86, longitude: 2.36 }}
                mapUrl="/static-map.png"
            />,
        );

        expect(screen.getByTestId('agency-columns')).toHaveClass(
            'lg:grid-cols-2',
            'lg:divide-x',
        );
        // Plus de bouton « Modifier » : il vit dans le menu « ⋯ ».
        expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();

        // L'adresse est une seule ligne (Google Places).
        expect(
            screen.getByRole('button', { name: 'Modifier Adresse' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Modifier Rue' }),
        ).toBeNull();
        // Aucune carte dans le bloc Contact, ni Google ni statique : la carte
        // ne s'ouvre que par « Voir sur la carte » (redemandé trois fois par
        // l'équipe le 28 octobre 2026 ; ne pas la remettre).
        const contactBlock = screen.getByRole('region', { name: 'Contact' });
        expect(within(contactBlock).queryByRole('application')).toBeNull();
        expect(contactBlock.querySelector('img')).toBeNull();

        await user.click(
            screen.getByRole('button', { name: 'Modifier Téléphone' }),
        );
        const input = screen.getByRole('textbox', { name: 'Téléphone' });
        await user.clear(input);
        await user.type(input, '+33 1 42 00 00 01{Enter}');
        expect(patch).toHaveBeenCalledWith(
            `/real-estate/agencies/${agency.uuid}/fields`,
            { phone: '+33 1 42 00 00 01' },
            expect.anything(),
        );

        const profile = within(
            screen.getByRole('region', { name: 'Profil de matching' }),
        );
        for (const label of [
            'Quartiers',
            'Spécialités',
            'Langues',
            'Mandats',
            'Loyer minimum',
            'Frais d’agence',
            'Garantme',
            'Dossiers étrangers',
        ]) {
            expect(
                profile.getByRole('button', { name: `Modifier ${label}` }),
            ).toBeInTheDocument();
        }
        expect(
            profile.queryByRole('button', { name: 'Modifier le profil' }),
        ).toBeNull();
        // Les notes se modifient dans la frise « Suivi et notes ».
        expect(
            within(
                screen.getByRole('region', { name: 'Suivi et notes' }),
            ).getByRole('button', { name: 'Modifier Notes' }),
        ).toBeInTheDocument();
    });
});
