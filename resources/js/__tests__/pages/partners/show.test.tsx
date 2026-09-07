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
        expect(contacts.getByText('Commerciale')).toBeInTheDocument();
        const dossiers = within(
            screen.getByRole('region', { name: 'Dossiers' }),
        );
        expect(
            dossiers.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/leads/abc');
        expect(dossiers.getByText('Assurance habitation')).toBeInTheDocument();
        const reach = within(
            screen.getByRole('region', { name: 'Joindre le partenaire' }),
        );
        expect(
            reach.getByRole('heading', { name: 'Joindre Marie Durand' }),
        ).toBeInTheDocument();
        expect(reach.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/33142001122',
        );
        expect(
            screen.getByRole('link', { name: 'Tous les partenaires' }),
        ).toHaveAttribute('href', '/partners');

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
                    email: null,
                    phone: null,
                    website: null,
                    notes: null,
                })}
                types={partnerTypes}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Joindre Zen Assurances' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Aucune coordonnée enregistrée.'),
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

        await user.click(
            screen.getByRole('button', { name: 'Modifier Marie Durand' }),
        );
        const edit = screen.getByRole('dialog', {
            name: 'Modifier Marie Durand',
        });
        expect(within(edit).getByLabelText('Fonction')).toHaveValue(
            'Commerciale',
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
            screen.getByRole('button', { name: 'Retirer Marie Durand' }),
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
});
