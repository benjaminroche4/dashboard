import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { destroy, download, role } = vi.hoisted(() => ({
    destroy: vi.fn(),
    download: vi.fn().mockResolvedValue(true),
    role: { value: 'admin' },
}));

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
    router: { delete: destroy },
    usePage: () => ({
        props: { auth: { user: { id: 1, name: 'Admin', role: role.value } } },
    }),
}));

vi.mock('@/lib/download-document-request-pdf', () => ({
    downloadDocumentRequestPdf: download,
}));

import { DocumentRequestRowActions } from '@/components/documents/document-request-row-actions';
import { makeDocumentRequest } from '@/test/fixtures/document-request';

describe('DocumentRequestRowActions', () => {
    beforeEach(() => {
        destroy.mockClear();
        download.mockClear();
        role.value = 'admin';
    });

    it('links to the list and its edit page, downloads the PDF and deletes after confirmation', async () => {
        const user = userEvent.setup();
        render(<DocumentRequestRowActions request={makeDocumentRequest()} />);

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Léa Martin' }),
        );

        expect(
            await screen.findByRole('menuitem', { name: 'Voir la liste' }),
        ).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Modifier' }),
        ).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001/edit',
        );

        await user.click(
            screen.getByRole('menuitem', { name: 'Télécharger le PDF' }),
        );
        expect(download).toHaveBeenCalledWith(
            '0199b0c0-0000-7000-8000-000000000001',
            'Léa Martin',
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Léa Martin' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Supprimer' }),
        );
        expect(await screen.findByRole('dialog')).toHaveTextContent(
            'Supprimer la liste de Léa Martin ?',
        );
        await user.click(
            screen.getByRole('button', { name: 'Supprimer la liste' }),
        );
        expect(destroy).toHaveBeenCalledWith(
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001',
            expect.any(Object),
        );
    });

    it('hides the deletion from non-admins and the view link on the detail page', async () => {
        role.value = 'member';
        const user = userEvent.setup();
        render(
            <DocumentRequestRowActions
                request={makeDocumentRequest()}
                hideView
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions pour Léa Martin' }),
        );

        expect(
            await screen.findByRole('menuitem', { name: 'Modifier' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Voir la liste' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Supprimer' }),
        ).not.toBeInTheDocument();
    });
});
