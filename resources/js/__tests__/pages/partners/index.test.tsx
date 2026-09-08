import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: del },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, string>) => useFormStub(initial),
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

import PartnersIndex from '@/pages/partners/index';
import { makePartner, partnerTypes } from '@/test/fixtures/partner';

const partners = [
    makePartner(),
    makePartner({
        id: 2,
        uuid: '0199a9a0-0000-7000-8000-0000000000c2',
        name: 'Alpha Gestion',
        type: 'management',
        type_label: 'Gestion',
        contacts: [],
        email: null,
        phone: null,
        website: null,
        street: null,
    }),
];

describe('Partners index page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
    });

    it('lists the partners with type badge, contact, address and author, and filters by type', async () => {
        const user = userEvent.setup();
        render(<PartnersIndex partners={partners} types={partnerTypes} />);

        expect(screen.getByText('2 partenaire(s)')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Zen Assurances' }),
        ).toHaveAttribute(
            'href',
            '/partners/0199a9a0-0000-7000-8000-0000000000c1',
        );
        expect(screen.getByText('Marie Durand')).toBeInTheDocument();
        expect(
            screen.getByText('8 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Admin')).toHaveLength(2);

        const filter = screen.getByRole('button', { name: 'Filtres' });
        await user.click(filter);
        expect(
            await screen.findByRole('menuitemcheckbox', { name: /Assurance/ }),
        ).toHaveTextContent('1');
        await user.click(
            screen.getByRole('menuitemcheckbox', { name: /Gestion/ }),
        );
        await user.keyboard('{Escape}');
        expect(filter).toHaveTextContent('1');
        expect(
            screen.getByRole('button', { name: 'Réinitialiser' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Zen Assurances' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Alpha Gestion' }),
        ).toBeInTheDocument();

        // Le type filtré est présélectionné dans le formulaire d'ajout.
        await user.click(
            screen.getByRole('button', { name: 'Nouveau partenaire' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Nouveau partenaire',
        });
        expect(
            within(dialog).getByRole('combobox', { name: 'Type' }),
        ).toHaveTextContent('Gestion');
        expect(
            within(dialog).getByRole('combobox', { name: 'Indicatif' }),
        ).toBeInTheDocument();
        await user.type(within(dialog).getByLabelText('Nom'), 'Beta Gestion');

        // L'e-mail de bienvenue : décoché par défaut, et seulement avec un e-mail.
        const notify = within(dialog).getByRole('checkbox', {
            name: /Prévenir le partenaire par e-mail/,
        });
        expect(notify).toBeDisabled();
        await user.type(
            within(dialog).getByLabelText('E-mail'),
            'contact@beta.example',
        );
        expect(notify).toBeEnabled();
        expect(notify).not.toBeChecked();
        await user.click(notify);
        expect(notify).toBeChecked();

        await user.click(
            within(dialog).getByRole('button', {
                name: 'Ajouter le partenaire',
            }),
        );
        expect(post).toHaveBeenCalledWith(
            '/partners',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('does not offer the welcome e-mail when editing a partner', async () => {
        const user = userEvent.setup();
        render(<PartnersIndex partners={partners} types={partnerTypes} />);

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zen Assurances' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        expect(
            within(
                screen.getByRole('dialog', { name: 'Modifier Zen Assurances' }),
            ).queryByRole('checkbox', { name: /Prévenir le partenaire/ }),
        ).toBeNull();
    });

    it('edits a partner from its menu', async () => {
        const user = userEvent.setup();
        render(<PartnersIndex partners={partners} types={partnerTypes} />);

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Zen Assurances' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Modifier' }));
        const dialog = screen.getByRole('dialog', {
            name: 'Modifier Zen Assurances',
        });
        expect(within(dialog).getByLabelText('Nom')).toHaveValue(
            'Zen Assurances',
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Enregistrer' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/partners/0199a9a0-0000-7000-8000-0000000000c1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
