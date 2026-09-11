import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch, post } = vi.hoisted(() => ({ patch: vi.fn(), post: vi.fn() }));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: vi.fn(), post },
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

import OwnerShow from '@/pages/owners/show';
import { makeOwner, ownerKinds } from '@/test/fixtures/owner';
import { makeProperty } from '@/test/fixtures/property';

const stats = {
    properties: 1,
    open: 1,
    rented: 0,
    rent_cents: 150000,
    last_visit_at: null,
};

describe('Owner detail page', () => {
    it('shows contact, the properties held and opens the edit dialog', async () => {
        const user = userEvent.setup();
        render(
            <OwnerShow
                owner={makeOwner({
                    notes: 'Préfère être appelée le matin.',
                })}
                properties={[makeProperty()]}
                stats={stats}
                kinds={ownerKinds}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Zoé Martin',
        );
        expect(screen.getByText('Particulier')).toBeInTheDocument();
        // Les coordonnées sont dans l'en-tête : la carte « Joindre » faisait doublon.
        expect(
            screen.getByRole('link', { name: 'zoe@example.com' }),
        ).toHaveAttribute('href', 'mailto:zoe@example.com');
        expect(
            screen.getByText('8 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull();
        expect(
            screen.getByText('Préfère être appelée le matin.'),
        ).toBeInTheDocument();

        // Sans lead d'origine, aucune carte : l'annuaire n'est pas un pipeline.
        expect(
            screen.queryByRole('region', { name: 'Lead propriétaire' }),
        ).not.toBeInTheDocument();

        const properties = within(
            screen.getByRole('region', { name: 'Biens' }),
        );
        expect(
            properties.getByRole('link', { name: 'T2 lumineux · 11e' }),
        ).toHaveAttribute(
            'href',
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
        );
        expect(properties.getByText(/1 500,00 € \/ mois/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Modifier' }));
        const dialog = within(
            await screen.findByRole('dialog', { name: 'Modifier Zoé Martin' }),
        );
        expect(dialog.getByLabelText('E-mail')).toHaveValue('zoe@example.com');
    });

    it('names a company by its trade name and adds a property from the page', () => {
        render(
            <OwnerShow
                owner={makeOwner({
                    kind: 'company',
                    kind_label: 'Société ou agence',
                    name: 'SCI du Marais',
                    company: 'SCI du Marais',
                    contact_name: 'Zoé Martin',
                })}
                properties={[]}
                stats={{ ...stats, properties: 0, open: 0, rent_cents: 0 }}
                kinds={ownerKinds}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'SCI du Marais',
        );
        expect(screen.getByText('Société ou agence')).toBeInTheDocument();
        expect(screen.getByText('Zoé Martin')).toBeInTheDocument();

        // Un propriétaire peut détenir plusieurs biens : on en ajoute d'ici.
        expect(
            screen.getByRole('link', { name: /Ajouter un bien/ }),
        ).toHaveAttribute(
            'href',
            '/properties/create?owner=0199a9a0-0000-7000-8000-0000000000d1',
        );
        expect(
            screen.getByText(/Aucun bien rattaché pour l’instant/),
        ).toBeInTheDocument();
    });

    it('notes an exchange, recalls the lead it came from and sums up the parc', async () => {
        const user = userEvent.setup();
        render(
            <OwnerShow
                owner={makeOwner({
                    last_contacted_at: '2026-09-01T09:00:00+00:00',
                    lead: {
                        id: 7,
                        uuid: 'lead-7',
                        name: 'Zoé Martin',
                        reference: 'LD-4242',
                        status_label: 'En signature',
                        assignee: 'Admin',
                    },
                })}
                properties={[makeProperty()]}
                stats={{
                    properties: 3,
                    open: 2,
                    rented: 1,
                    rent_cents: 450000,
                    last_visit_at: '2026-09-08T10:00:00+00:00',
                }}
                kinds={ownerKinds}
            />,
        );

        // Fraîcheur de la relation, comme sur un agent ou un partenaire.
        const relation = within(
            screen.getByRole('region', { name: 'Suivi de la relation' }),
        );
        expect(
            relation.getByText('Dernier échange le 1 septembre 2026'),
        ).toBeInTheDocument();
        await user.click(
            relation.getByRole('button', { name: 'Échange noté' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/owners/0199a9a0-0000-7000-8000-0000000000d1/contact',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );

        // D'où vient la fiche : la prospection reste le lead.
        const lead = within(
            screen.getByRole('region', { name: 'Lead propriétaire' }),
        );
        expect(lead.getByRole('link', { name: 'Zoé Martin' })).toHaveAttribute(
            'href',
            '/locataires/lead-7',
        );
        expect(
            lead.getByText('LD-4242 · En signature · Admin'),
        ).toBeInTheDocument();

        // L'état du parc, que la liste des biens ne dit pas.
        const parc = within(screen.getByRole('region', { name: 'Biens' }));
        expect(parc.getByText('Disponibles')).toBeInTheDocument();
        expect(parc.getByText('4 500,00 €')).toBeInTheDocument();
        expect(
            parc.getByText('Dernière visite le 8 septembre 2026.'),
        ).toBeInTheDocument();
    });
});
