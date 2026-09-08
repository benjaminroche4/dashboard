import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

let transform: (data: Record<string, unknown>) => unknown = (data) => data;

vi.mock('@inertiajs/react', () => ({
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
            auth: { user: { id: 2, name: 'Charles', role: 'member' } },
            staff: [
                { id: 1, name: 'Admin', role: 'admin', avatar: null },
                { id: 2, name: 'Charles', role: 'member', avatar: null },
            ],
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

import { VisitForm } from '@/components/visits/visit-form';
import { propertyFormOptions } from '@/test/fixtures/property';

const clients = [
    { id: 1, uuid: 'client-1', name: 'Léa Durand', reference: 'LD-4821' },
];

function renderForm() {
    return render(
        <VisitForm
            clients={clients}
            properties={[]}
            options={propertyFormOptions}
            defaultClientId={1}
        />,
    );
}

describe('VisitForm', () => {
    beforeEach(() => {
        post.mockReset();
    });

    it('assigns the visit to the current member by default and sends floor, lease type, charges and photos of a new property', async () => {
        const user = userEvent.setup();
        renderForm();
        const dialog = within(
            screen.getByRole('form', { name: 'Planifier une visite' }),
        );

        expect(dialog.getByLabelText('Visite assignée à')).toHaveTextContent(
            'Charles',
        );

        await user.type(dialog.getByLabelText('Adresse'), '3 rue de la Paix');
        await user.type(dialog.getByLabelText('Arrondissement'), '2');
        await user.type(dialog.getByLabelText('Étage'), '4');
        await user.type(dialog.getByLabelText('Charges mensuelles'), '120');
        await user.click(dialog.getByLabelText('Type de bail'));
        await user.click(
            await screen.findByRole('option', { name: 'Bail mobilité' }),
        );
        const photo = new File(['x'], 'salon.jpg', { type: 'image/jpeg' });
        await user.upload(dialog.getByLabelText('Photos'), photo);
        expect(dialog.getByText('salon.jpg')).toBeInTheDocument();

        await user.type(
            dialog.getByLabelText('Commentaires internes'),
            'Client très intéressé.',
        );
        await user.click(
            dialog.getByRole('button', { name: 'Planifier la visite' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/clients/visits',
            expect.objectContaining({
                lead_id: 1,
                assigned_to: 2,
                notes: 'Client très intéressé.',
                property: expect.objectContaining({
                    street: '3 rue de la Paix',
                    district: 2,
                    floor: 4,
                    charges_cents: 12_000,
                    lease_type: 'mobility',
                    photos: [photo],
                }),
            }),
            expect.objectContaining({ forceFormData: true }),
        );
    });

    it('does not email the client unless the box is ticked', async () => {
        const user = userEvent.setup();
        renderForm();
        const form = within(
            screen.getByRole('form', { name: 'Planifier une visite' }),
        );
        const box = form.getByRole('checkbox', {
            name: /Informer le client par e-mail/,
        });
        expect(box).not.toBeChecked();

        await user.type(form.getByLabelText('Adresse'), '3 rue de la Paix');
        await user.type(form.getByLabelText('Arrondissement'), '2');
        await user.click(
            form.getByRole('button', { name: 'Planifier la visite' }),
        );
        expect(post).toHaveBeenLastCalledWith(
            '/clients/visits',
            expect.objectContaining({ notify_client: false }),
            expect.anything(),
        );

        await user.click(box);
        expect(box).toBeChecked();
        await user.click(
            form.getByRole('button', { name: 'Planifier la visite' }),
        );
        expect(post).toHaveBeenLastCalledWith(
            '/clients/visits',
            expect.objectContaining({ notify_client: true }),
            expect.anything(),
        );
    });

    it('cancels back to the visits list', () => {
        renderForm();

        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/clients/visits',
        );
    });

    it('removes a chosen photo and lets the assignee be cleared', async () => {
        const user = userEvent.setup();
        renderForm();
        const dialog = within(
            screen.getByRole('form', { name: 'Planifier une visite' }),
        );

        await user.upload(
            dialog.getByLabelText('Photos'),
            new File(['x'], 'cuisine.png', { type: 'image/png' }),
        );
        await user.click(
            dialog.getByRole('button', { name: 'Retirer cuisine.png' }),
        );
        expect(dialog.queryByText('cuisine.png')).not.toBeInTheDocument();

        await user.click(dialog.getByLabelText('Visite assignée à'));
        await user.click(
            await screen.findByRole('option', {
                name: 'Personne pour l’instant',
            }),
        );
        await user.type(dialog.getByLabelText('Adresse'), '1 rue x');
        await user.click(
            dialog.getByRole('button', { name: 'Planifier la visite' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/clients/visits',
            expect.objectContaining({
                assigned_to: null,
                property: expect.objectContaining({ photos: [] }),
            }),
            expect.objectContaining({ forceFormData: false }),
        );
    });
});
