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
import { makeVisitClient } from '@/test/fixtures/visit';

const clients = [
    makeVisitClient({
        id: 1,
        uuid: 'client-1',
        name: 'Léa Durand',
        reference: 'LD-4821',
    }),
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

    it('assigns the visit to the current member by default and sends floor, lease type and charges of a new property', async () => {
        const user = userEvent.setup();
        renderForm();
        const dialog = within(
            screen.getByRole('form', { name: 'Planifier une visite' }),
        );

        expect(dialog.getByLabelText('Visite réalisée par')).toHaveTextContent(
            'Charles',
        );

        await user.type(dialog.getByLabelText('Adresse'), '3 rue de la Paix');
        await user.type(dialog.getByLabelText('Arrondissement'), '2');
        await user.click(dialog.getByLabelText('Étage'));
        await user.click(
            await screen.findByRole('option', { name: '4e étage' }),
        );
        await user.type(dialog.getByLabelText('Charges mensuelles (€)'), '120');
        // Charges comprises : le libellé du champ suit la case cochée.
        await user.click(dialog.getByLabelText('Loyer charges comprises'));
        expect(dialog.getByLabelText('Dont charges (€)')).toHaveValue(120);
        await user.click(dialog.getByLabelText('Type de bail'));
        await user.click(
            await screen.findByRole('option', { name: 'Bail mobilité' }),
        );
        // Aucune photo depuis un dossier : le champ n'existe pas (mobile compris).
        expect(dialog.queryByLabelText('Photos')).not.toBeInTheDocument();
        // Le titre du bien ne se saisit pas en planifiant une visite.
        expect(dialog.queryByLabelText('Titre')).not.toBeInTheDocument();

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
                    floor: '4',
                    charges_cents: 12_000,
                    charges_included: true,
                    lease_type: 'mobility',
                    photos: [],
                }),
            }),
            expect.anything(),
        );
    });

    it('emails an accompanied client by default, and not once unticked', async () => {
        const user = userEvent.setup();
        renderForm();
        const form = within(
            screen.getByRole('form', { name: 'Planifier une visite' }),
        );
        const box = form.getByRole('checkbox', {
            name: /Informer le client par e-mail/,
        });
        // Formule « Accompagné » : le client vient, la confirmation est cochée.
        expect(box).toBeChecked();

        await user.type(form.getByLabelText('Adresse'), '3 rue de la Paix');
        await user.type(form.getByLabelText('Arrondissement'), '2');
        await user.click(
            form.getByRole('button', { name: 'Planifier la visite' }),
        );
        expect(post).toHaveBeenLastCalledWith(
            '/clients/visits',
            expect.objectContaining({ notify_client: true }),
            expect.anything(),
        );

        await user.click(box);
        expect(box).not.toBeChecked();
        await user.click(
            form.getByRole('button', { name: 'Planifier la visite' }),
        );
        expect(post).toHaveBeenLastCalledWith(
            '/clients/visits',
            expect.objectContaining({ notify_client: false }),
            expect.anything(),
        );
    });

    it('adapts to the offer: an entrusted client is visited without them', async () => {
        const user = userEvent.setup();
        render(
            <VisitForm
                clients={[
                    makeVisitClient(),
                    makeVisitClient({
                        id: 2,
                        uuid: 'client-2',
                        name: 'Bruno Petit',
                        reference: 'LD-9002',
                        offer: 'confie',
                        offer_label: 'Confié',
                    }),
                ]}
                properties={[]}
                options={propertyFormOptions}
                defaultClientId={1}
            />,
        );

        // Accompagné : le client vient, on lui envoie la confirmation. La
        // formule est un bloc à part entière, sous le créneau.
        const offer = () => screen.getByRole('note');
        expect(offer()).toHaveTextContent('Formule Accompagné');
        expect(offer()).toHaveTextContent('le client visite lui-même.');
        expect(
            screen.getByRole('checkbox', {
                name: /Informer le client par e-mail/,
            }),
        ).toBeChecked();
        expect(
            screen.getByLabelText('Visite réalisée par'),
        ).toBeInTheDocument();

        await user.click(screen.getByLabelText('Client'));
        await user.click(
            await screen.findByRole('option', { name: /Bruno Petit/ }),
        );

        // Confié : l'équipe visite seule, pas d'e-mail au client.
        expect(offer()).toHaveTextContent('Formule Confié');
        expect(offer()).toHaveTextContent('l’équipe visite sans le client.');
        expect(
            screen.queryByRole('checkbox', {
                name: /Informer le client par e-mail/,
            }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByLabelText('Visite réalisée par'),
        ).toBeInTheDocument();
    });

    it('cancels back to the visits list', () => {
        renderForm();

        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/clients/visits',
        );
    });

    it('lets the assignee be cleared', async () => {
        const user = userEvent.setup();
        renderForm();
        const dialog = within(
            screen.getByRole('form', { name: 'Planifier une visite' }),
        );

        await user.click(dialog.getByLabelText('Visite réalisée par'));
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
            expect.anything(),
        );
    });

    it('shows the visit type without letting it be chosen', async () => {
        const user = userEvent.setup();
        render(
            <VisitForm
                clients={[
                    makeVisitClient({
                        offer: 'accompagne',
                        offer_label: 'Accompagné',
                    }),
                    makeVisitClient({
                        id: 2,
                        uuid: 'client-2',
                        name: 'Bruno Petit',
                        reference: 'LD-9002',
                        offer: 'confie',
                        offer_label: 'Confié',
                    }),
                ]}
                properties={[]}
                options={propertyFormOptions}
                defaultClientId={1}
            />,
        );

        // La formule décide : aucun choix n'est offert.
        expect(
            screen.queryByRole('radiogroup', { name: 'Type de visite' }),
        ).toBeNull();
        expect(screen.getByText('Visite autonome')).toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: /Client/ }));
        await user.click(
            await screen.findByRole('option', { name: /Bruno Petit/ }),
        );

        expect(screen.getByText('Par l’équipe')).toBeInTheDocument();
        expect(screen.queryByText('Visite autonome')).toBeNull();
    });
});
