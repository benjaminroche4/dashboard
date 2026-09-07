import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { role } = vi.hoisted(() => ({ role: { value: 'admin' } }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn(), delete: vi.fn() },
    usePage: () => ({ props: { auth: { user: { role: role.value } } } }),
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

import DocumentsIndex from '@/pages/documents/index';
import { makeDocumentRequest } from '@/test/fixtures/document-request';

describe('Documents index page', () => {
    it('lists the requests without any sending status and links to each one', () => {
        render(
            <DocumentsIndex
                requests={[
                    makeDocumentRequest(),
                    makeDocumentRequest({
                        id: 2,
                        name: 'John Doe',
                        language_label: 'Anglais',
                    }),
                ]}
            />,
        );

        expect(screen.getByText('2 demande(s)')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Léa Martin' }),
        ).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001',
        );
        expect(screen.queryByText('À envoyer')).toBeNull();
        expect(screen.queryByText('Statut')).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Actions pour John Doe' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Nouvelle demande/ }),
        ).toHaveAttribute('href', '/tools/documents/create');
    });

    it('shows an empty state', () => {
        render(<DocumentsIndex requests={[]} />);

        expect(screen.getByText('Aucun résultat.')).toBeInTheDocument();
    });

    it('shows the bulk actions once a row is selected, deletion for admins only', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <DocumentsIndex requests={[makeDocumentRequest()]} />,
        );

        expect(
            screen.queryByRole('group', { name: 'Actions groupées' }),
        ).toBeNull();
        await user.click(
            screen.getByRole('checkbox', { name: 'Sélectionner Léa Martin' }),
        );
        expect(screen.queryByRole('button', { name: /Envoyer/ })).toBeNull();
        expect(
            screen.getByRole('button', { name: /Supprimer \(1\)/ }),
        ).toBeInTheDocument();
        unmount();

        role.value = 'member';
        render(<DocumentsIndex requests={[makeDocumentRequest()]} />);
        await user.click(
            screen.getByRole('checkbox', { name: 'Sélectionner Léa Martin' }),
        );
        expect(
            screen.queryByRole('group', { name: 'Actions groupées' }),
        ).toBeNull();
        role.value = 'admin';
    });

    it('offers the catalog to admins only through the « … » menu', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <DocumentsIndex requests={[makeDocumentRequest()]} />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Plus d’actions' }),
        );
        expect(
            await screen.findByRole('menuitem', {
                name: 'Modifier les pièces',
            }),
        ).toHaveAttribute('href', '/tools/documents/catalog');
        unmount();

        role.value = 'member';
        render(<DocumentsIndex requests={[makeDocumentRequest()]} />);
        expect(
            screen.queryByRole('button', { name: 'Plus d’actions' }),
        ).toBeNull();
        role.value = 'admin';
    });
});
