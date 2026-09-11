import { render, screen, within } from '@testing-library/react';
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
            features: {
                addressAutocomplete: false,
                googleMapsKey: null,
                assistant: true,
            },
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
        // L'import d'annonce est un bouton de l'en-tête, pas un bloc du formulaire.
        expect(
            screen.getByRole('button', { name: 'Import AI' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Vous avez une annonce/),
        ).not.toBeInTheDocument();
        // Le nom du bien est calculé : il ne se saisit nulle part.
        expect(screen.queryByLabelText('Titre')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/properties',
        );

        await user.type(
            screen.getByRole('textbox', { name: 'Adresse' }),
            '5 rue de Bretagne',
        );
        await user.clear(screen.getByLabelText('Code postal'));
        await user.type(screen.getByLabelText('Code postal'), '75003');
        await user.type(screen.getByLabelText('Loyer mensuel (€)'), '1800');

        // L'étage se choisit dans une liste : du rez-de-chaussée au dernier étage.
        await user.click(screen.getByRole('combobox', { name: 'Étage' }));
        expect(
            await screen.findByRole('option', { name: 'Rez-de-chaussée' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: '8e étage et plus' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('option', { name: 'Dernier étage' }));

        await user.click(
            screen.getByRole('button', { name: 'Ajouter le bien' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/properties',
            expect.objectContaining({
                street: '5 rue de Bretagne',
                postal_code: '75003',
                district: 3,
                floor: 'top',
                rent_cents: 180_000,
                currency: 'EUR',
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('offers the listing details: bedrooms, orientation, deposit and amenities with icons', async () => {
        const user = userEvent.setup();
        render(<PropertyEdit property={null} {...propertyFormOptions} />);

        await user.type(screen.getByLabelText('Chambres'), '2');
        await user.type(screen.getByLabelText('Salles de bain'), '1');
        await user.type(screen.getByLabelText('Étages de l’immeuble'), '6');
        await user.type(screen.getByLabelText('Dépôt de garantie (€)'), '2100');
        await user.click(screen.getByRole('button', { name: 'Sud' }));
        await user.click(screen.getByRole('button', { name: 'Ascenseur' }));
        await user.click(screen.getByRole('button', { name: 'Wi-Fi' }));

        // L'équipement porte son icône, à côté de son libellé.
        expect(
            screen
                .getByRole('button', { name: 'Ascenseur' })
                .querySelector('svg'),
        ).not.toBeNull();

        await user.type(
            screen.getByRole('textbox', { name: 'Adresse' }),
            '5 rue de Bretagne',
        );
        await user.click(
            screen.getByRole('button', { name: 'Ajouter le bien' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/properties',
            expect.objectContaining({
                bedrooms: 2,
                bathrooms: 1,
                building_floors: 6,
                deposit_cents: 210_000,
                orientations: ['south'],
                amenities: ['elevator', 'wifi'],
            }),
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the transport found by the assistant in the summary card', () => {
        render(
            <PropertyEdit property={makeProperty()} {...propertyFormOptions} />,
        );

        const summary = screen.getByRole('complementary', {
            name: 'Récapitulatif du bien',
        });
        const transit = within(summary).getByRole('region', {
            name: 'Transports proches',
        });

        // Les lignes desservies sont des badges, pas du texte courant.
        expect(
            within(transit).getByText('Métro Oberkampf'),
        ).toBeInTheDocument();
        expect(within(transit).getByText('2')).toBeInTheDocument();
        expect(within(transit).getByText('9')).toBeInTheDocument();
        expect(within(transit).getByText('4 min à pied')).toBeInTheDocument();
        expect(within(transit).getByText('Bus Saint-Maur')).toBeInTheDocument();
        expect(within(transit).getByText('96')).toBeInTheDocument();
        expect(
            within(transit).getByLabelText('Proposé par l’assistant IA'),
        ).toBeInTheDocument();
    });

    it('edits a property prefilled from the dedicated page and patches it', async () => {
        const user = userEvent.setup();
        const property = makeProperty();
        render(<PropertyEdit property={property} {...propertyFormOptions} />);

        expect(
            screen.getByRole('heading', { name: 'Modifier T2 lumineux · 11e' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Adresse' })).toHaveValue(
            '12 rue Oberkampf',
        );
        expect(screen.getByLabelText('Loyer mensuel (€)')).toHaveValue(1500);
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
        );

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        // Multipart pour les photos : POST avec `_method: patch`.
        expect(post).toHaveBeenCalledWith(
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
            expect.objectContaining({
                street: '12 rue Oberkampf',
                rent_cents: 150_000,
                agent_id: 7,
                _method: 'patch',
                kept_photos: [],
            }),
            expect.objectContaining({
                preserveScroll: true,
                forceFormData: true,
            }),
        );
    });

    it('creates an agent and an owner without leaving the form, then selects them', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <PropertyEdit property={null} {...propertyFormOptions} />,
        );

        // Le dialogue s'ouvre par-dessus le formulaire, sans quitter la page.
        await user.click(screen.getByRole('button', { name: 'Nouvel agent' }));
        expect(
            await screen.findByRole('heading', { name: 'Nouvel agent' }),
        ).toBeInTheDocument();

        // Une fois créé, l'agent arrive dans les options et devient celui du bien.
        rerender(
            <PropertyEdit
                property={null}
                {...propertyFormOptions}
                agents={[
                    ...propertyFormOptions.agents,
                    { id: 9, name: 'Nina Roux', agency: null },
                ]}
            />,
        );
        expect(screen.getByLabelText('Agent immobilier')).toHaveTextContent(
            'Nina Roux',
        );

        // Le dialogue de l'agent reste ouvert : on le referme avant l'autre.
        await user.keyboard('{Escape}');
        await user.click(
            screen.getByRole('button', { name: 'Nouveau propriétaire' }),
        );
        expect(
            await screen.findByRole('heading', {
                name: 'Nouveau propriétaire',
            }),
        ).toBeInTheDocument();

        rerender(
            <PropertyEdit
                property={null}
                {...propertyFormOptions}
                agents={[
                    ...propertyFormOptions.agents,
                    { id: 9, name: 'Nina Roux', agency: null },
                ]}
                owners={[
                    ...propertyFormOptions.owners,
                    { id: 12, name: 'Camille Roy' },
                ]}
            />,
        );
        expect(screen.getByLabelText('Propriétaire')).toHaveTextContent(
            'Camille Roy',
        );
    });

    it('recaps the property being typed, next to the form', async () => {
        const user = userEvent.setup();
        render(<PropertyEdit property={null} {...propertyFormOptions} />);

        const recap = within(
            screen.getByRole('complementary', {
                name: 'Récapitulatif du bien',
            }),
        );
        // Rien de saisi : la carte le dit plutôt que d'afficher du vide.
        expect(recap.getByText('Bien sans nom')).toBeInTheDocument();
        expect(recap.getAllByText('Non renseigné').length).toBeGreaterThan(0);
        expect(recap.getByText('Loyer non renseigné')).toBeInTheDocument();
        // Ni photo ni jauge : la carte se lit d'un coup d'œil.
        expect(recap.queryByRole('img')).not.toBeInTheDocument();
        expect(recap.queryByRole('progressbar')).not.toBeInTheDocument();

        await user.type(
            screen.getByRole('textbox', { name: 'Adresse' }),
            '5 rue de Bretagne',
        );
        await user.type(screen.getByLabelText('Loyer mensuel (€)'), '1800');
        await user.type(screen.getByLabelText('Charges mensuelles (€)'), '90');

        // Le récapitulatif suit la saisie, libellés et montants mis en forme.
        expect(recap.getByText('5 rue de Bretagne, Paris')).toBeInTheDocument();
        expect(recap.getByText('1 800,00 € / mois')).toBeInTheDocument();
        expect(recap.getByText('+ 90,00 € de charges')).toBeInTheDocument();
        expect(recap.getByText('Disponible')).toBeInTheDocument();
    });

    it('declares breadcrumbs under Réseau › Biens', () => {
        expect(
            PropertyEdit.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Réseau', 'Biens', 'Nouveau bien']);
    });
});
