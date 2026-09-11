import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, del, routerPost } = vi.hoisted(() => ({
    post: vi.fn(),
    del: vi.fn(),
    routerPost: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { delete: del, post: routerPost },
    usePage: () => ({ props: { features: { assistant: true } } }),
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
    useForm: (initial: Record<string, string>) => {
        const [data, setData] = useState(initial);

        return {
            data,
            errors: {} as Record<string, string | undefined>,
            processing: false,
            setData: (key: string, value: string) =>
                setData((current) => ({ ...current, [key]: value })),
            clearErrors: () => undefined,
            post: (url: string, options: unknown) => post(url, data, options),
        };
    },
}));

import { ClientProperties } from '@/components/clients/client-properties';
import type { ClientProperty } from '@/types';

const property: ClientProperty = {
    id: 1,
    uuid: 'prop-1',
    label: 'T2 lumineux · 11e',
    street: '12 rue Oberkampf',
    postal_code: '75011',
    city: 'Paris',
    property_type_label: 'T2',
    surface_m2: 42,
    rent_cents: 150_000,
    currency: 'EUR',
    listing_url: null,
    agent: 'Zoé Martin',
    assigned_lead: null,
    visits_count: 2,
    next_visit_at: '2026-09-20T10:00:00+02:00',
};
const options = [
    {
        id: 2,
        label: 'Studio · 5e',
        street: '3 rue Mouffetard',
        postal_code: '75005',
        city: 'Paris',
    },
];

describe('ClientProperties', () => {
    beforeEach(() => {
        post.mockReset();
        del.mockReset();
        routerPost.mockReset();
    });

    it('lists the linked properties with their visits, a visit shortcut and removal', async () => {
        const user = userEvent.setup();
        render(
            <ClientProperties
                clientUuid="client-1"
                properties={[property]}
                options={options}
            />,
        );

        const item = screen.getByRole('listitem');
        expect(item).toHaveTextContent('T2 lumineux · 11e');
        expect(item).toHaveTextContent(
            '12 rue Oberkampf, 75011 Paris · T2 · 42 m²',
        );
        expect(item).toHaveTextContent('/ mois · Agent : Zoé Martin');
        expect(item).toHaveTextContent('2 visite(s) · prochaine');
        expect(
            within(item).getByRole('link', { name: 'Planifier une visite' }),
        ).toHaveAttribute(
            'href',
            '/clients/visits/create?client=client-1&property=prop-1',
        );

        await user.click(
            within(item).getByRole('button', {
                name: 'Retirer T2 lumineux · 11e du dossier',
            }),
        );
        expect(del).toHaveBeenCalledWith(
            '/clients/client-1/properties/prop-1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('flags a property attributed to a client, and says nothing for a free one', () => {
        const { rerender } = render(
            <ClientProperties
                clientUuid="client-1"
                properties={[property]}
                options={options}
            />,
        );
        expect(screen.queryByLabelText(/^Attribué à /)).not.toBeInTheDocument();

        rerender(
            <ClientProperties
                clientUuid="client-1"
                properties={[
                    {
                        ...property,
                        assigned_lead: {
                            uuid: 'client-1',
                            name: 'Bruno & Charles',
                        },
                    },
                ]}
                options={options}
            />,
        );
        expect(
            screen.getByLabelText('Attribué à Bruno & Charles'),
        ).toHaveTextContent('Attribué à Bruno & Charles');
    });

    it('links a property from the directory through the dialog', async () => {
        const user = userEvent.setup();
        render(
            <ClientProperties
                clientUuid="client-1"
                properties={[]}
                options={options}
            />,
        );

        expect(
            screen.getByText('Aucun bien rattaché à ce dossier.'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Lier un bien' }));
        const dialog = within(await screen.findByRole('dialog'));
        expect(
            dialog.getByRole('button', { name: 'Lier le bien' }),
        ).toBeDisabled();
        await user.click(dialog.getByRole('combobox', { name: 'Bien' }));
        await user.click(
            await screen.findByRole('option', { name: /Studio · 5e/ }),
        );
        await user.click(dialog.getByRole('button', { name: 'Lier le bien' }));

        expect(post).toHaveBeenCalledWith(
            '/clients/client-1/properties',
            { property_id: '2' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('suggests matching properties with their reasons, and links one in a click', async () => {
        const user = userEvent.setup();
        render(
            <ClientProperties
                clientUuid="client-1"
                properties={[]}
                options={options}
                suggestions={[
                    {
                        id: 9,
                        uuid: 'prop-9',
                        label: 'T2 · 11e',
                        street: '20 rue de la Roquette',
                        postal_code: '75011',
                        city: 'Paris',
                        property_type_label: 'T2',
                        furnished_label: 'Meublé',
                        surface_m2: 40,
                        rent_cents: 160_000,
                        currency: 'EUR',
                        listing_url: null,
                        agent: null,
                        score: 9,
                        reasons: [
                            'Dans le budget',
                            'Arrondissement recherché (11e)',
                        ],
                    },
                ]}
            />,
        );

        const section = within(
            screen.getByRole('region', { name: 'Biens suggérés' }),
        );
        const item = section.getByRole('listitem');
        expect(item).toHaveTextContent('T2 · 11e');
        expect(item).toHaveTextContent('Dans le budget');
        expect(item).toHaveTextContent('Arrondissement recherché (11e)');
        expect(
            within(item).getByRole('link', { name: 'Planifier une visite' }),
        ).toHaveAttribute(
            'href',
            '/clients/visits/create?client=client-1&property=prop-9',
        );

        await user.click(
            within(item).getByRole('button', { name: 'Lier au dossier' }),
        );
        expect(routerPost).toHaveBeenCalledWith(
            '/clients/client-1/properties',
            { property_id: 9 },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('refines the suggestions with the assistant: reorders them and shows a reason per property', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                ranking: [10, 9],
                explanations: [
                    {
                        id: 9,
                        fit: 'weak',
                        reason: 'Rez-de-chaussée sur cour, le client veut de la lumière.',
                    },
                    {
                        id: 10,
                        fit: 'strong',
                        reason: 'Dernier étage lumineux, calme, animaux acceptés.',
                    },
                ],
            }),
        });
        vi.stubGlobal('fetch', fetchMock);
        const base = {
            street: '20 rue de la Roquette',
            postal_code: '75011',
            city: 'Paris',
            property_type_label: 'T2',
            furnished_label: 'Meublé',
            surface_m2: 40,
            rent_cents: 160_000,
            currency: 'EUR',
            listing_url: null,
            agent: null,
            score: 9,
            reasons: ['Dans le budget'],
        };
        render(
            <ClientProperties
                clientUuid="client-1"
                properties={[]}
                options={options}
                suggestions={[
                    { ...base, id: 9, uuid: 'prop-9', label: 'T2 · 11e' },
                    { ...base, id: 10, uuid: 'prop-10', label: 'T3 · 11e' },
                ]}
            />,
        );

        const section = within(
            screen.getByRole('region', { name: 'Biens suggérés' }),
        );
        expect(section.getAllByRole('listitem')[0]).toHaveTextContent(
            'T2 · 11e',
        );
        await user.click(
            section.getByRole('button', { name: 'Affiner avec l’IA' }),
        );

        const items = await section.findAllByTestId('suggestion-explanation');
        expect(items).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledWith(
            '/clients/client-1/properties/explain',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(section.getAllByRole('listitem')[0]).toHaveTextContent(
            'T3 · 11e',
        );
        expect(section.getAllByRole('listitem')[0]).toHaveTextContent(
            'À proposer en priorité',
        );
        expect(section.getAllByRole('listitem')[0]).toHaveTextContent(
            'Dernier étage lumineux',
        );
        expect(section.getAllByRole('listitem')[1]).toHaveTextContent(
            'En réserve',
        );
        expect(
            section.getByRole('button', { name: 'Affiner à nouveau' }),
        ).toBeInTheDocument();
        vi.unstubAllGlobals();
    });

    it('disables linking when every property is already on the file', () => {
        render(
            <ClientProperties
                clientUuid="client-1"
                properties={[property]}
                options={[]}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Lier un bien' }),
        ).toBeDisabled();
    });
});
