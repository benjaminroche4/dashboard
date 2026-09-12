import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

const { post, patch, del } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: del },
    usePage: () => ({
        props: {
            auth: { user: { role: 'member' } },
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
        post,
        patch,
    };
}

import PartnerShow from '@/pages/partners/show';
import { makePartnerDetail, partnerTypes } from '@/test/fixtures/partner';
import { makeInvoice } from '@/test/fixtures/invoice';
import { makeQuote } from '@/test/fixtures/quote';

describe('Partner detail page', () => {
    it('shows the type, coordinates, contact actions and opens the edit dialog', async () => {
        const user = userEvent.setup();
        render(
            <PartnerShow
                partner={makePartnerDetail({
                    notes: 'Tarif négocié -10 %.',
                    leads: [
                        {
                            id: 5,
                            uuid: 'abc',
                            name: 'Léa Durand',
                            status_label: 'En cours',
                            role_label: 'Assurance habitation',
                            at: null,
                        },
                    ],
                })}
                types={partnerTypes}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Zen Assurances' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Assurance')).toBeInTheDocument();
        expect(
            screen.getByText('8 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(screen.getByText('Tarif négocié -10 %.')).toBeInTheDocument();
        const contacts = within(
            screen.getByRole('region', { name: 'Interlocuteurs' }),
        );
        expect(contacts.getByText('Marie Durand')).toBeInTheDocument();
        expect(contacts.getByText('Commercial')).toBeInTheDocument();
        // Téléphone et e-mail sont cliquables, sur leur propre ligne.
        expect(
            contacts.getByRole('link', { name: '+33 6 12 34 56 78' }),
        ).toHaveAttribute('href', 'tel:+33612345678');
        expect(
            contacts.getByRole('link', { name: 'marie@zen.example' }),
        ).toHaveAttribute('href', 'mailto:marie@zen.example');
        const dossiers = within(
            screen.getByRole('region', { name: 'Dossiers' }),
        );
        expect(
            dossiers.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/locataires/abc');
        expect(dossiers.getByText('Assurance habitation')).toBeInTheDocument();
        // Joindre le partenaire passe par ses interlocuteurs, plus par une
        // carte à part : seul le suivi de la relation reste dans la colonne.
        expect(
            screen.getByRole('region', { name: 'Suivi de la relation' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'WhatsApp' })).toBeNull();
        // Le retour se fait par le fil d'Ariane : plus de lien dans l'en-tête.
        expect(
            screen.queryByRole('link', { name: 'Tous les partenaires' }),
        ).toBeNull();
        expect(screen.getByText(/Ajouté\(e\) par/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Modifier' }));
        expect(
            screen.getByRole('dialog', { name: 'Modifier Zen Assurances' }),
        ).toBeInTheDocument();

        // Membre : pas de suppression.
        await user.keyboard('{Escape}');
        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zen Assurances' }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Supprimer' }),
        ).not.toBeInTheDocument();
    });

    it('shows the empty states', () => {
        render(
            <PartnerShow
                partner={makePartnerDetail({
                    contacts: [],
                    contacts_count: 0,
                    primary_contact: null,
                    email: null,
                    phone: null,
                    website: null,
                    notes: null,
                })}
                types={partnerTypes}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Suivi de la relation' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucune note.')).toBeInTheDocument();
        expect(
            screen.getByText('Aucun interlocuteur enregistré.'),
        ).toBeInTheDocument();
    });

    it('adds, edits and removes a contact', async () => {
        const user = userEvent.setup();
        render(
            <PartnerShow partner={makePartnerDetail()} types={partnerTypes} />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un interlocuteur' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Nouvel interlocuteur',
        });
        await user.type(within(dialog).getByLabelText('Prénom'), 'paul');
        await user.type(within(dialog).getByLabelText('Nom'), 'Roux');
        await user.click(
            within(dialog).getByRole('button', {
                name: 'Ajouter l’interlocuteur',
            }),
        );
        expect(post).toHaveBeenCalledWith(
            '/partners/0199a9a0-0000-7000-8000-0000000000c1/contacts',
            expect.objectContaining({ preserveScroll: true }),
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Annuler' }),
        );

        // Modifier et retirer passent par le menu « ⋯ » de l'interlocuteur.
        await user.click(
            screen.getByRole('button', { name: 'Actions pour Marie Durand' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        );
        const edit = screen.getByRole('dialog', {
            name: 'Modifier Marie Durand',
        });
        expect(within(edit).getByLabelText('Fonction')).toHaveTextContent(
            'Commercial',
        );
        await user.click(
            within(edit).getByRole('button', { name: 'Enregistrer' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/partners/0199a9a0-0000-7000-8000-0000000000c1/contacts/1',
            expect.objectContaining({ preserveScroll: true }),
        );
        await user.click(within(edit).getByRole('button', { name: 'Annuler' }));

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Marie Durand' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Retirer' }),
        );
        await user.click(
            within(
                screen.getByRole('dialog', { name: 'Retirer Marie Durand ?' }),
            ).getByRole('button', { name: 'Retirer' }),
        );
        expect(del).toHaveBeenCalledWith(
            '/partners/0199a9a0-0000-7000-8000-0000000000c1/contacts/1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('lists the quotes and invoices of the partner and offers to create one', () => {
        render(
            <PartnerShow
                partner={makePartnerDetail()}
                types={partnerTypes}
                quotes={[makeQuote({ number: 'DV-27042' })]}
                invoices={[makeInvoice({ number: 'RP-27042' })]}
                can={{ quotes: true, invoices: true }}
            />,
        );

        const billing = within(
            screen.getByRole('region', { name: 'Devis et factures' }),
        );
        expect(billing.getByRole('link', { name: /DV-27042/ })).toHaveAttribute(
            'href',
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001',
        );
        expect(billing.getByRole('link', { name: /RP-27042/ })).toHaveAttribute(
            'href',
            '/invoices/0199a9a0-0000-7000-8000-000000000101',
        );
        // La création part de la fiche, le partenaire est prérempli.
        expect(
            billing.getByRole('link', { name: 'Nouveau devis' }),
        ).toHaveAttribute(
            'href',
            '/tools/quotes/create?partner=0199a9a0-0000-7000-8000-0000000000c1',
        );
        expect(
            billing.getByRole('link', { name: 'Nouvelle facture' }),
        ).toHaveAttribute(
            'href',
            '/invoices/create?partner=0199a9a0-0000-7000-8000-0000000000c1',
        );
    });

    it('hides the billing section from a member who may not create either', () => {
        render(
            <PartnerShow partner={makePartnerDetail()} types={partnerTypes} />,
        );

        expect(
            screen.queryByRole('region', { name: 'Devis et factures' }),
        ).not.toBeInTheDocument();
    });
});
