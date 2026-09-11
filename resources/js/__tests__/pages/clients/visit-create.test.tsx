import { makeVisitClient, visitModes } from '@/test/fixtures/visit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

let transform: (data: Record<string, unknown>) => unknown = (data) => data;

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
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
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin', role: 'member' } },
            staff: [{ id: 1, name: 'Admin', role: 'member', avatar: null }],
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, unknown>) => {
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
            transform: (fn: (data: Record<string, unknown>) => unknown) => {
                transform = fn;
            },
            post: (url: string, options: unknown) =>
                post(url, transform(data), options),
        };
    },
}));

import VisitCreate from '@/pages/clients/visit-create';
import { propertyFormOptions } from '@/test/fixtures/property';

const clients = [
    makeVisitClient({
        id: 1,
        uuid: 'client-1',
        name: 'Léa Durand',
        reference: 'LD-4821',
    }),
    makeVisitClient({
        id: 2,
        uuid: 'client-2',
        name: 'Paul Roux',
        reference: 'LD-4822',
    }),
];
const properties = [
    {
        id: 1,
        label: 'T2 lumineux · 11e',
        street: '12 rue Oberkampf',
        postal_code: '75011',
        city: 'Paris',
    },
];

describe('Visit create page', () => {
    beforeEach(() => {
        post.mockReset();
    });

    it('is a dedicated page with the preselected client and schedules a visit on a new property', async () => {
        const user = userEvent.setup();
        render(
            <VisitCreate
                clients={clients}
                visitModes={visitModes}
                properties={properties}
                defaultClientId={2}
                {...propertyFormOptions}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Planifier une visite' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Client')).toHaveTextContent('Paul Roux');

        await user.click(screen.getByRole('radio', { name: 'Nouveau bien' }));
        await user.type(screen.getByLabelText('Adresse'), '12 rue Oberkampf');
        await user.clear(screen.getByLabelText('Code postal'));
        await user.type(screen.getByLabelText('Code postal'), '75011');
        await user.type(screen.getByLabelText('Loyer mensuel (€)'), '1500');
        await user.click(
            screen.getByRole('button', { name: 'Planifier la visite' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/clients/visits',
            expect.objectContaining({
                lead_id: 2,
                property_id: null,
                property: expect.objectContaining({
                    street: '12 rue Oberkampf',
                    district: 11,
                    rent_cents: 150_000,
                }),
                scheduled_at: expect.stringMatching(
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
                ),
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('declares breadcrumbs under Clients › Visites', () => {
        expect(
            VisitCreate.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Clients', 'Visites', 'Planifier une visite']);
        expect(VisitCreate.layout.breadcrumbs[2]?.href.url).toBe(
            '/clients/visits/create',
        );
    });
});
