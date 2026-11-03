import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch, visit } = vi.hoisted(() => ({ patch: vi.fn(), visit: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: vi.fn(), visit, patch },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, unknown>) => useFormStub(initial),
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

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, unknown>, value?: unknown) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        transform: () => undefined,
        post: vi.fn(),
        patch,
    };
}

import PropertyShow from '@/pages/properties/show';
import { makeOwner } from '@/test/fixtures/owner';
import { makeProperty, propertyFormOptions } from '@/test/fixtures/property';

const clients = [
    {
        id: 7,
        uuid: 'lead-1',
        name: 'Léa Durand',
        reference: 'LD-0042',
    },
];

const visits = [
    {
        id: 1,
        uuid: 'visit-1',
        scheduled_at: '2026-09-10T09:00:00+00:00',
        status: 'planned' as const,
        status_label: 'Planifiée',
        client: { uuid: 'lead-1', name: 'Léa Durand', reference: 'LD-0042' },
        agent: 'Zoé Martin',
    },
];

describe('Property assignment and photos', () => {
    it('shows a green banner and the assignment button on an assigned property', async () => {
        const user = userEvent.setup();
        render(
            <PropertyShow
                property={makeProperty({
                    assigned_lead: {
                        uuid: 'client-uuid',
                        name: 'Léa Durand',
                    },
                    assigned_at: '2026-09-10T10:00:00+02:00',
                })}
                owner={null}
                clients={[
                    {
                        id: 1,
                        uuid: 'client-uuid',
                        name: 'Léa Durand',
                        reference: 'LD-4821',
                    },
                ]}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        const banner = within(
            screen.getByRole('region', { name: 'Bien attribué' }),
        );
        expect(
            banner.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/clients/client-uuid');
        expect(
            banner.getByText(/n’est plus proposé pour une visite/),
        ).toBeInTheDocument();

        // Le bouton rouvre l'attribution, avec la possibilité de libérer.
        await user.click(
            screen.getByRole('button', { name: /Changer l’attribution/ }),
        );
        expect(
            within(await screen.findByRole('dialog')).getByRole('button', {
                name: 'Libérer le bien',
            }),
        ).toBeInTheDocument();
    });

    it('makes a photo the main one from the star on its tile', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <PropertyShow
                property={makeProperty({
                    photos: ['/storage/a.jpg', '/storage/b.jpg'],
                })}
                owner={null}
                clients={[]}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        // « Toutes les photos » est replié par défaut : la galerie d'en-tête suffit.
        await user.click(
            screen.getByRole('button', { name: /Toutes les photos/ }),
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Définir la photo 2 comme principale',
            }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1/cover',
            { index: 1 },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});

describe('Property detail page', () => {
    it('reads as a listing: price once, collapsible sections, contacts and tenant', async () => {
        const user = userEvent.setup();
        render(
            <PropertyShow
                property={makeProperty({
                    notes: 'Digicode 1234.',
                    assigned_lead: { uuid: 'lead-1', name: 'Léa Durand' },
                })}
                owner={makeOwner({ name: 'Ali Bensaïd', uuid: 'owner-1' })}
                agency={{
                    id: 3,
                    uuid: 'agency-1',
                    name: 'Agence du Marais',
                    address: null,
                }}
                clients={clients}
                visits={visits}
                {...propertyFormOptions}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'T2 lumineux · 11e',
        );
        expect(screen.getByTestId('property-columns')).toBeInTheDocument();

        // Le prix en tête, avec les charges et le total : pas de second encadré.
        const price = screen.getByTestId('property-price');
        expect(within(price).getByText('1 500,00 €')).toBeInTheDocument();
        expect(price).toHaveTextContent(/de charges/);
        expect(price).toHaveTextContent(/1 600,00 €.*au total/);
        expect(screen.queryByText('Loyer mensuel')).toBeNull();

        expect(
            within(
                screen.getByRole('region', { name: 'Description' }),
            ).getByText('Digicode 1234.'),
        ).toBeInTheDocument();
        const housing = within(
            screen.getByRole('region', { name: 'Le logement en détail' }),
        );
        expect(housing.getByText('42 m²')).toBeInTheDocument();
        expect(housing.getByText('3e étage')).toBeInTheDocument();
        const lease = within(
            screen.getByRole('region', { name: 'Loyer et bail' }),
        );
        expect(lease.getByText('1 500,00 € / mois')).toBeInTheDocument();
        expect(
            lease.getByRole('link', { name: /Ouvrir l’annonce/ }),
        ).toHaveAttribute('href', 'https://www.seloger.com/annonces/123.htm');

        // Chaque section se replie d'un clic sur son titre.
        await user.click(
            screen.getByRole('button', { name: /Le logement en détail/ }),
        );
        expect(screen.queryByText('42 m²')).toBeNull();

        const contacts = within(
            screen.getByRole('region', { name: 'Contacts' }),
        );
        expect(
            contacts.getByRole('link', { name: 'Ali Bensaïd' }),
        ).toHaveAttribute('href', '/owners/owner-1');
        expect(
            contacts.getByRole('link', { name: 'Agence du Marais' }),
        ).toHaveAttribute('href', '/real-estate/agencies/agency-1');
        expect(
            contacts.getByRole('link', { name: 'Zoé Martin' }),
        ).toHaveAttribute('href', '/real-estate/agents/agent-uuid');

        const visitsRegion = within(
            screen.getByRole('region', { name: 'Visites' }),
        );
        expect(
            visitsRegion.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/clients/lead-1');

        const tenant = within(
            screen.getByRole('region', { name: 'Locataire définitif' }),
        );
        expect(
            tenant.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/clients/lead-1');
        expect(tenant.getByText('LD-0042')).toBeInTheDocument();

        // « Modifier » et « Fiche PDF » vivent dans le menu « ⋯ ».
        await user.click(screen.getByRole('button', { name: /Actions pour/ }));
        expect(
            await screen.findByRole('menuitem', { name: 'Fiche PDF' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        expect(visit).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1/edit',
        );
    });

    it('edits a line in place', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <PropertyShow
                property={makeProperty({ bedrooms: null })}
                owner={null}
                clients={[]}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Modifier Chambres' }),
        );
        const input = screen.getByRole('spinbutton');
        await user.type(input, '2{Enter}');

        expect(patch).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1/fields',
            { bedrooms: 2 },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('offers quick actions when nothing is attached', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <PropertyShow
                property={makeProperty({ agent: null, photos: [] })}
                owner={null}
                clients={[]}
                clientOptions={clients}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        expect(screen.getByText(/Aucune photo\./)).toBeInTheDocument();
        expect(
            screen.getByText('Aucune visite pour ce bien.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Aucun locataire pour l’instant/),
        ).toBeInTheDocument();

        // Les contacts se rattachent ensemble, dans une seule modale.
        await user.click(
            screen.getByRole('button', { name: /Ajouter un propriétaire/ }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        expect(dialog.getByText('Contacts du bien')).toBeInTheDocument();
        for (const label of ['Propriétaire', 'Agence', 'Agent', 'Partenaire']) {
            expect(dialog.getByLabelText(label)).toBeInTheDocument();
        }
        await user.click(dialog.getByRole('button', { name: 'Enregistrer' }));
        expect(patch).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1/fields',
            {
                owner_id: null,
                agency_id: null,
                agent_id: null,
                partner_id: null,
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('assigns the property to any client in progress', async () => {
        const user = userEvent.setup();
        render(
            <PropertyShow
                property={makeProperty()}
                owner={null}
                clients={[]}
                clientOptions={clients}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: /Attribuer à un client/ }),
        );
        const dialog = within(await screen.findByRole('dialog'));
        // Le dossier n'était pas encore proposé : il est quand même au choix.
        expect(dialog.queryByText(/Aucun dossier n’est rattaché/)).toBeNull();
        expect(dialog.getByRole('combobox')).toBeInTheDocument();
    });

    it('offers the map only once the address has been located', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <PropertyShow
                property={makeProperty({ latitude: null, longitude: null })}
                owner={null}
                clients={[]}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        // Sans position, le bouton promettrait une carte qu'on ne sait pas
        // dessiner : il ne s'affiche pas.
        expect(
            screen.queryByRole('button', { name: 'Voir sur la carte' }),
        ).toBeNull();
        unmount();

        render(
            <PropertyShow
                property={makeProperty({
                    latitude: 48.8566,
                    longitude: 2.3522,
                })}
                owner={null}
                clients={[]}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Voir sur la carte' }),
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
