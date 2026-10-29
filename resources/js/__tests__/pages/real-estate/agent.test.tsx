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
    router: { delete: vi.fn(), patch },
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
import {
    agencyOptions,
    makeAgent,
    makeContactHistoryEntry,
} from '@/test/fixtures/real-estate';

describe('Agent detail page', () => {
    it('makes the header tile the photo button: initials without a photo, the portrait with one', () => {
        const { rerender } = render(
            <AgentShow
                agent={makeAgent({ name: 'Marthe Dupuy' })}
                agency={null}
                agencies={agencyOptions}
            />,
        );

        const tile = screen.getByRole('button', { name: 'Ajouter une photo' });
        expect(tile).toHaveTextContent('MD');
        expect(screen.getByTestId('agent-header')).toContainElement(tile);
        // Ni carte Google ni carte statique dans le bloc Contact : la carte
        // ne s'ouvre que par « Voir sur la carte » (28 octobre 2026).
        const contactBlock = screen.getByRole('region', { name: 'Contact' });
        expect(within(contactBlock).queryByRole('application')).toBeNull();
        expect(contactBlock.querySelector('img')).toBeNull();
        // Même largeur que la fiche lead (max-w-6xl), demandé le 28 octobre 2026.
        expect(screen.getByTestId('agent-columns').parentElement).toHaveClass(
            'max-w-6xl',
        );

        rerender(
            <AgentShow
                agent={makeAgent({ photo: '/storage/agent-photos/a.png' })}
                agency={null}
                agencies={agencyOptions}
            />,
        );
        expect(
            screen
                .getByRole('button', { name: 'Changer la photo' })
                .querySelector('img'),
        ).toHaveAttribute('src', '/storage/agent-photos/a.png');
    });

    it('shows contact, agency link, leads and opens the edit dialog', async () => {
        const user = userEvent.setup();
        render(
            <AgentShow
                agent={makeAgent({
                    is_favorite: true,
                    notes: 'Très réactive.',
                    leads: [
                        {
                            uuid: 'abc',
                            name: 'Léa Durand',
                            status_label: 'En cours',
                            is_client: false,
                        },
                        {
                            uuid: 'def',
                            name: 'Bruno & Charles',
                            status_label: 'Converti',
                            is_client: true,
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
                    latitude: 48.86,
                    longitude: 2.36,
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
        // Favori : une étoile à côté du nom.
        expect(screen.getByRole('img', { name: 'Favori' })).toBeInTheDocument();
        const agencyCard = within(
            screen.getByRole('region', { name: 'Agence' }),
        );
        expect(
            agencyCard.getByText('12 rue de Turenne, 75003 Paris'),
        ).toBeInTheDocument();
        expect(agencyCard.getByText('2 agent(s)')).toBeInTheDocument();
        // Plus de raccourcis téléphone, e-mail et site web : ils se lisent
        // sur la fiche de l'agence, que le bouton ouvre.
        expect(
            agencyCard.queryByRole('link', { name: '+33 1 42 00 00 00' }),
        ).toBeNull();
        expect(agencyCard.queryByRole('link', { name: 'Site web' })).toBeNull();
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
        // Un agent rattaché n'a pas d'adresse propre : la carte « Coordonnées »
        // montre celle de son agence, et le dit.
        const contact = within(screen.getByRole('region', { name: 'Contact' }));
        expect(contact.getByText('Adresse de l’agence')).toBeInTheDocument();
        expect(
            contact.getByText('12 rue de Turenne, 75003 Paris'),
        ).toBeInTheDocument();
        // La carte « Joindre » faisait doublon avec les coordonnées de l'en-tête.
        expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull();
        expect(screen.getByText('Très réactive.')).toBeInTheDocument();
        const leads = within(
            screen.getByRole('region', { name: 'Leads et clients' }),
        );
        expect(leads.getByRole('link', { name: 'Léa Durand' })).toHaveAttribute(
            'href',
            '/locataires/abc',
        );
        // Un lead converti est un dossier client : badge « Client » et lien vers le dossier.
        expect(
            leads.getByRole('link', { name: 'Bruno & Charles' }),
        ).toHaveAttribute('href', '/clients/def');
        expect(leads.getByText('Client')).toBeInTheDocument();
        // Le retour se fait par le fil d'Ariane : plus de lien dans l'en-tête.
        expect(
            screen.queryByRole('link', { name: 'Tous les agents' }),
        ).toBeNull();

        // « Modifier » vit dans le menu « ⋯ », comme sur la fiche lead.
        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zoé Martin' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        );
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

    it('marks an independent agent and the empty states', async () => {
        const user = userEvent.setup();
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
        // L'en-tête le dit en badge, et la ligne « Agence » du contact aussi.
        expect(
            within(screen.getByTestId('agent-header')).getByText('Indépendant'),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucune note.')).toBeInTheDocument();
        // L'accordéon « Leads et clients » est replié quand il est vide : on l'ouvre.
        await user.click(
            screen.getByRole('button', { name: /Leads et clients/ }),
        );
        expect(
            screen.getByText(
                /Aucun lead ni dossier client ne lui est rattaché/,
            ),
        ).toBeInTheDocument();
        // Téléphone, e-mail, qualité de la relation, adresse : chaque ligne
        // vide garde sa place, à compléter en place, plus les trois lignes du
        // profil de matching.
        expect(screen.getAllByText('Non renseigné')).toHaveLength(7);
    });

    it('follows the lead fiche: two columns split by a rule, contact rows on the left, the follow-up as a timeline', () => {
        render(
            <AgentShow
                agent={makeAgent()}
                agency={null}
                agencies={agencyOptions}
                contacts={[makeContactHistoryEntry()]}
            />,
        );

        expect(screen.getByTestId('agent-columns')).toHaveClass(
            'lg:grid-cols-2',
            'lg:divide-x',
        );
        // L'en-tête sur fond gris porte la qualité de la relation en badge.
        expect(screen.getByTestId('agent-header')).toHaveClass('bg-sidebar');
        const card = within(screen.getByRole('region', { name: 'Contact' }));
        expect(card.getByText('Téléphone')).toBeInTheDocument();
        expect(
            card.getByRole('link', { name: '+33 6 12 34 56 78' }),
        ).toHaveAttribute('href', 'tel:+33612345678');
        expect(card.getByText('Visites avec cet agent')).toBeInTheDocument();
        const followUp = within(
            screen.getByRole('region', { name: 'Suivi et notes' }),
        );
        expect(followUp.getByText('Dernier échange')).toBeInTheDocument();
        // À côté du dernier échange, le lien qui ouvre l'historique complet.
        expect(
            followUp.getByRole('button', { name: "Voir l'historique" }),
        ).toBeInTheDocument();
        expect(followUp.getAllByTestId('timeline-dot')).toHaveLength(2);
        expect(
            followUp.getByRole('button', { name: 'Échange noté' }),
        ).toBeInTheDocument();
        // Plus de bouton « Modifier » dans l'en-tête : il est dans le menu « ⋯ ».
        expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
    });

    it('edits a field in place and posts it alone on agents.fields', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <AgentShow
                agent={makeAgent({ agency: null })}
                agency={null}
                agencies={agencyOptions}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Téléphone' }),
        );
        const input = screen.getByRole('textbox', { name: 'Téléphone' });
        await user.clear(input);
        await user.type(input, '+33 6 99 99 99 99{Enter}');

        expect(patch).toHaveBeenCalledWith(
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1/fields',
            { phone: '+33 6 99 99 99 99' },
            expect.anything(),
        );

        // Les notes se modifient dans la frise, en zone de texte.
        await user.click(
            screen.getByRole('button', { name: 'Modifier Notes' }),
        );
        expect(
            screen.getByRole('textbox', { name: 'Notes' }),
        ).toBeInTheDocument();
        // L'agence se choisit dans une liste avec recherche.
        await user.click(
            screen.getByRole('button', { name: 'Modifier Agence' }),
        );
        await user.click(screen.getByRole('combobox', { name: 'Agence' }));
        expect(
            screen.getByPlaceholderText('Rechercher une agence…'),
        ).toBeInTheDocument();
        await user.click(
            await screen.findByRole('option', { name: /Indépendant/ }),
        );
        expect(patch).toHaveBeenLastCalledWith(
            expect.stringMatching(/\/fields$/),
            { agency_id: null },
            expect.anything(),
        );
        // Un indépendant saisit son adresse en une ligne (Google Places).
        expect(
            screen.getByRole('button', { name: 'Modifier Adresse' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Modifier Rue' }),
        ).toBeNull();
        // Le profil de matching est une fiche à filets, modifiable ligne à ligne.
        const profile = within(
            screen.getByRole('region', { name: 'Profil de matching' }),
        );
        expect(profile.getByText('Quartiers')).toBeInTheDocument();
        expect(
            profile.getByRole('button', { name: 'Modifier Spécialités' }),
        ).toBeInTheDocument();
        expect(
            profile.queryByRole('button', { name: 'Modifier le profil' }),
        ).toBeNull();
    });

    it('shows who noted the last exchange, next to its date and time', () => {
        render(
            <AgentShow
                agent={makeAgent({
                    agency: null,
                    last_contacted_at: '2026-10-28T14:44:00+01:00',
                })}
                agency={null}
                agencies={agencyOptions}
                contacts={[
                    makeContactHistoryEntry({
                        by: { id: 2, name: 'Camille Roy', avatar: null },
                    }),
                ]}
            />,
        );

        const followUp = within(
            screen.getByRole('region', { name: 'Suivi et notes' }),
        );
        expect(
            followUp.getByText(/28 octobre 2026 à 14:44/),
        ).toBeInTheDocument();
        expect(
            followUp.getByLabelText('Noté par Camille Roy'),
        ).toHaveTextContent('CR');
    });
});
