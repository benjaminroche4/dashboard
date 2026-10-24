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
    router: { delete: del, post, patch },
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

import CompaniesIndex from '@/pages/companies/index';
import { makeCompany, makeCompanyContact } from '@/test/fixtures/company';

const companies = [
    makeCompany(),
    makeCompany({
        id: 2,
        uuid: '0199c0c0-0000-7000-8000-0000000000e2',
        name: 'Alpha Industries',
        contacts: [
            makeCompanyContact({ id: 3, name: 'Ana Lopez', is_primary: false }),
        ],
        primary_contacts_count: 0,
        clients_count: 0,
        email: null,
        phone: null,
        website: null,
        street: null,
    }),
];

describe('Companies index page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
    });

    it('lists the companies with their primary contacts, clients count, address and author', () => {
        render(<CompaniesIndex companies={companies} />);

        expect(screen.getByText(/2 entreprise\(s\)/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Zen Conseil' }),
        ).toHaveAttribute(
            'href',
            '/companies/0199c0c0-0000-7000-8000-0000000000e1',
        );
        // Seuls les contacts principaux sont cités ; à défaut, le premier contact.
        expect(screen.getByText('Marie Durand')).toBeInTheDocument();
        expect(screen.queryByText('Paul Martin')).not.toBeInTheDocument();
        expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
        expect(
            screen.getByText('8 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Admin')).toHaveLength(2);
    });

    it('opens the add dialog and posts the new company', async () => {
        const user = userEvent.setup();
        render(<CompaniesIndex companies={companies} />);

        await user.click(
            screen.getByRole('button', { name: 'Nouvelle entreprise' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Nouvelle entreprise',
        });
        await user.type(
            within(dialog).getByLabelText('Nom'),
            'Nouvelle Société',
        );
        await user.click(
            within(dialog).getByRole('button', {
                name: 'Ajouter l’entreprise',
            }),
        );

        expect(post).toHaveBeenCalledWith(
            '/companies',
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
    });

    it('opens the edit dialog from the row menu with the company prefilled', async () => {
        const user = userEvent.setup();
        render(<CompaniesIndex companies={companies} />);

        const row = screen
            .getByRole('link', { name: 'Zen Conseil' })
            .closest('tr') as HTMLElement;
        await user.click(
            within(row).getByRole('button', {
                name: 'Actions pour Zen Conseil',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        );

        const dialog = screen.getByRole('dialog', {
            name: 'Modifier Zen Conseil',
        });
        expect(within(dialog).getByLabelText('Nom')).toHaveValue('Zen Conseil');
        await user.click(
            within(dialog).getByRole('button', { name: 'Enregistrer' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/companies/0199c0c0-0000-7000-8000-0000000000e1',
            expect.anything(),
        );
    });
});
