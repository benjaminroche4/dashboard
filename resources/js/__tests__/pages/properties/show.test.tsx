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
    it('shows the features, owner, agent and visits, and goes to the dedicated edit page', async () => {
        const user = userEvent.setup();
        render(
            <PropertyShow
                property={makeProperty({
                    notes: 'Digicode 1234.',
                    // Attribué : c'est son locataire définitif.
                    assigned_lead: { uuid: 'lead-1', name: 'Léa Durand' },
                })}
                owner={makeOwner({ name: 'Ali Bensaïd', uuid: 'owner-1' })}
                clients={clients}
                visits={visits}
                {...propertyFormOptions}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'T2 lumineux · 11e',
        );
        const features = within(
            screen.getByRole('region', { name: 'Caractéristiques' }),
        );
        expect(features.getByText('1 500,00 € / mois')).toBeInTheDocument();
        expect(features.getByText('42 m²')).toBeInTheDocument();
        expect(features.getByText('3e étage')).toBeInTheDocument();
        expect(
            features.getByRole('link', { name: /Ouvrir l’annonce/ }),
        ).toHaveAttribute('href', 'https://www.seloger.com/annonces/123.htm');
        expect(screen.getByText('Digicode 1234.')).toBeInTheDocument();

        const owner = within(
            screen.getByRole('region', { name: 'Propriétaire' }),
        );
        expect(
            owner.getByRole('link', { name: 'Ali Bensaïd' }),
        ).toHaveAttribute('href', '/owners/owner-1');
        expect(
            within(screen.getByRole('region', { name: 'Agent' })).getByRole(
                'link',
                { name: 'Zoé Martin' },
            ),
        ).toHaveAttribute('href', '/real-estate/agents/agent-uuid');

        const visitsRegion = within(
            screen.getByRole('region', { name: 'Visites' }),
        );
        expect(
            visitsRegion.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/clients/lead-1');
        expect(visitsRegion.getByText('Planifiée')).toBeInTheDocument();

        // Un bien n'a qu'un locataire à la fin : celui à qui il est attribué.
        const tenant = within(
            screen.getByRole('region', { name: 'Locataire définitif' }),
        );
        expect(
            tenant.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/clients/lead-1');
        expect(tenant.getByText('LD-0042')).toBeInTheDocument();

        // « Modifier » et « Fiche PDF » vivent dans le menu « ⋯ » : l'en-tête
        // ne garde que « Voir sur la carte ».
        expect(
            screen.queryByRole('button', { name: 'Modifier' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Fiche PDF' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /Actions pour/ }));
        expect(
            await screen.findByRole('menuitem', { name: 'Fiche PDF' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        expect(visit).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1/edit',
        );
    });

    it('explains when nothing is attached to the property', () => {
        render(
            <PropertyShow
                property={makeProperty({ agent: null, photos: [] })}
                owner={null}
                clients={[]}
                visits={[]}
                {...propertyFormOptions}
            />,
        );

        expect(
            screen.getByText(/Aucun propriétaire rattaché/),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucun agent rattaché.')).toBeInTheDocument();
        expect(
            screen.getByText(/Aucun locataire pour ce bien/),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Aucune visite pour ce bien.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucune photo.')).toBeInTheDocument();
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
