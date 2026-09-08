import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));

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
            auth: { user: { role: 'member' } },
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
            patch: (url: string, options: unknown) =>
                patch(url, transform(data), options),
        };
    },
}));

import PropertyEdit from '@/pages/properties/edit';
import { makeProperty, propertyFormOptions } from '@/test/fixtures/property';

describe('Property edit page', () => {
    beforeEach(() => {
        post.mockReset();
        patch.mockReset();
    });

    it('adds a property from the dedicated page, sending the rent in centimes', async () => {
        const user = userEvent.setup();
        render(<PropertyEdit property={null} {...propertyFormOptions} />);

        expect(
            screen.getByRole('heading', { name: 'Nouveau bien' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/properties',
        );

        await user.type(screen.getByLabelText('Adresse'), '5 rue de Bretagne');
        await user.clear(screen.getByLabelText('Code postal'));
        await user.type(screen.getByLabelText('Code postal'), '75003');
        await user.type(screen.getByLabelText('Loyer mensuel'), '1800');
        await user.click(
            screen.getByRole('button', { name: 'Ajouter le bien' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/properties',
            expect.objectContaining({
                street: '5 rue de Bretagne',
                postal_code: '75003',
                district: 3,
                rent_cents: 180_000,
                currency: 'EUR',
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('edits a property prefilled from the dedicated page and patches it', async () => {
        const user = userEvent.setup();
        const property = makeProperty();
        render(<PropertyEdit property={property} {...propertyFormOptions} />);

        expect(
            screen.getByRole('heading', { name: 'Modifier T2 lumineux · 11e' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Adresse')).toHaveValue(
            '12 rue Oberkampf',
        );
        expect(screen.getByLabelText('Loyer mensuel')).toHaveValue(1500);
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
        );

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(patch).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
            expect.objectContaining({
                street: '12 rue Oberkampf',
                rent_cents: 150_000,
                agent_id: 7,
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('declares breadcrumbs under Réseau › Biens', () => {
        expect(
            PropertyEdit.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Réseau', 'Biens', 'Bien']);
    });
});
