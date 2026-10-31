import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    router: { delete: del, post, patch },
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

import CompanyShow from '@/pages/companies/show';
import {
    makeCompanyClientOption,
    makeCompanyDetail,
} from '@/test/fixtures/company';

describe('Company detail page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
    });

    it('shows the coordinates, the contacts with their primary badge, the clients and the notes', () => {
        render(
            <CompanyShow
                company={makeCompanyDetail({ notes: 'Accord cadre 2026.' })}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Zen Conseil' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('8 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(screen.getByText('Accord cadre 2026.')).toBeInTheDocument();

        const contacts = within(
            screen.getByRole('region', { name: 'Contacts' }),
        );
        expect(contacts.getByText('Marie Durand')).toBeInTheDocument();
        expect(contacts.getByText('Paul Martin')).toBeInTheDocument();
        // Un seul des deux est principal.
        expect(contacts.getAllByText('Principal')).toHaveLength(1);
        expect(
            contacts.getByRole('link', { name: '+33 6 12 34 56 78' }),
        ).toHaveAttribute('href', 'tel:+33612345678');

        const clients = within(
            screen.getByRole('region', { name: 'Dossiers clients' }),
        );
        expect(
            clients.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute(
            'href',
            '/clients/0199c0c0-0000-7000-8000-0000000000a5',
        );
        expect(clients.getByText('Confié')).toBeInTheDocument();
        expect(clients.getByText(/LD-1234 · Arrivée le/)).toBeInTheDocument();
    });

    it('adds a contact, which may be primary even when another already is', async () => {
        const user = userEvent.setup();
        render(<CompanyShow company={makeCompanyDetail()} />);

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un contact' }),
        );
        const dialog = screen.getByRole('dialog', { name: 'Nouveau contact' });
        await user.type(within(dialog).getByLabelText('Prénom'), 'ana');
        await user.type(within(dialog).getByLabelText('Nom'), 'lopez');
        await user.click(
            within(dialog).getByRole('checkbox', {
                name: /Contact principal/,
            }),
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Ajouter le contact' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/companies/0199c0c0-0000-7000-8000-0000000000e1/contacts',
            expect.anything(),
        );
    });

    it('attaches a free client dossier and detaches an attached one', async () => {
        const user = userEvent.setup();
        render(
            <CompanyShow
                company={makeCompanyDetail()}
                clientOptions={[makeCompanyClientOption()]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Rattacher un client' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Rattacher un client',
        });
        const confirm = within(dialog).getByRole('button', {
            name: 'Rattacher',
        });
        expect(confirm).toBeDisabled();

        await user.click(within(dialog).getByRole('combobox', { name: '' }));
        await user.click(
            await screen.findByRole('option', { name: /Paul Martin/ }),
        );
        await user.click(confirm);

        expect(post).toHaveBeenCalledWith(
            '/companies/0199c0c0-0000-7000-8000-0000000000e1/clients',
            { lead_id: 9 },
            expect.anything(),
        );

        // La requête est simulée : on referme la modale à la main avant de
        // détacher, sinon la page derrière reste inaccessible.
        await user.keyboard('{Escape}');
        await user.click(
            screen.getByRole('button', { name: 'Détacher Léa Durand' }),
        );
        expect(del).toHaveBeenCalledWith(
            '/companies/0199c0c0-0000-7000-8000-0000000000e1/clients/0199c0c0-0000-7000-8000-0000000000a5',
            expect.anything(),
        );
    });

    it('shows the logo in the header as a tile that changes it, and the removal in the « ⋯ » menu', async () => {
        const user = userEvent.setup();
        render(
            <CompanyShow
                company={makeCompanyDetail({
                    logo: '/storage/company-logos/zen.png',
                })}
            />,
        );

        const tile = screen.getByRole('button', { name: 'Changer le logo' });
        expect(tile.querySelector('img')).toHaveAttribute(
            'src',
            '/storage/company-logos/zen.png',
        );
        expect(screen.queryByText('ZC')).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: /Actions pour Zen Conseil/ }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Retirer le logo' }),
        ).toBeInTheDocument();
    });

    it('offers « Voir sur la carte » once the fiche is geocoded, like the other directory pages', () => {
        const { rerender } = render(
            <CompanyShow company={makeCompanyDetail()} />,
        );
        expect(
            screen.queryByRole('button', { name: 'Voir sur la carte' }),
        ).toBeNull();

        rerender(
            <CompanyShow
                company={makeCompanyDetail({
                    latitude: 48.8656,
                    longitude: 2.3705,
                })}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Voir sur la carte' }),
        ).toBeInTheDocument();
    });
});
