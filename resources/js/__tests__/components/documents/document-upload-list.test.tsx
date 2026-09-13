import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, del } = vi.hoisted(() => ({ patch: vi.fn(), del: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { patch, delete: del },
}));

import { DocumentUploadList } from '@/components/documents/document-upload-list';
import { makeDocumentUpload } from '@/test/fixtures/document-request';

const requestUuid = '0199b0c0-0000-7000-8000-000000000001';
const reviewUrl = `/tools/documents/${requestUuid}/uploads/0199b0c0-0000-7000-8000-0000000000aa`;

describe('DocumentUploadList', () => {
    it('accepts a document and tints its card green', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[makeDocumentUpload()]}
                canReview
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Valider passeport.pdf' }),
        );
        expect(patch).toHaveBeenCalledWith(
            reviewUrl,
            { status: 'accepted', note: null },
            expect.objectContaining({ preserveScroll: true }),
        );

        unmount();
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[
                    makeDocumentUpload({
                        status: 'accepted',
                        status_label: 'Validée',
                        reviewer: 'Admin',
                    }),
                ]}
                canReview
            />,
        );
        const item = screen.getByRole('listitem');
        expect(item.querySelector('.bg-green-50')).not.toBeNull();
        expect(within(item).getByText(/Validée · Admin/)).toBeInTheDocument();
        // Une pièce validée se remet en vérification, elle ne se revalide pas.
        expect(
            screen.queryByRole('button', { name: 'Valider passeport.pdf' }),
        ).not.toBeInTheDocument();
    });

    it('refuses a document with a reason the client will read', async () => {
        const user = userEvent.setup();
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[makeDocumentUpload()]}
                canReview
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Refuser passeport.pdf' }),
        );
        const dialog = within(
            await screen.findByRole('dialog', {
                name: /Refuser passeport.pdf/,
            }),
        );
        await user.type(
            dialog.getByLabelText('Motif du refus'),
            'Document illisible.',
        );
        await user.click(
            dialog.getByRole('button', { name: 'Refuser la pièce' }),
        );

        expect(patch).toHaveBeenCalledWith(
            reviewUrl,
            { status: 'refused', note: 'Document illisible.' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('tints a refused card red and shows the reason', () => {
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[
                    makeDocumentUpload({
                        status: 'refused',
                        status_label: 'Refusée',
                        review_note: 'Page manquante.',
                        reviewer: 'Admin',
                    }),
                ]}
            />,
        );

        const item = screen.getByRole('listitem');
        expect(item.querySelector('.bg-red-50')).not.toBeNull();
        expect(
            within(item).getByText(/Refusée · Admin — Page manquante\./),
        ).toBeInTheDocument();
    });

    it('stays neutral and silent while nothing is decided', () => {
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[makeDocumentUpload()]}
                canReview
            />,
        );

        const item = screen.getByRole('listitem');
        expect(item.querySelector('.bg-green-50')).toBeNull();
        expect(item.querySelector('.bg-red-50')).toBeNull();
        // Pas de mention d'état tant que l'équipe ne s'est pas prononcée.
        expect(within(item).queryByText(/À relire/)).not.toBeInTheDocument();
    });

    it('offers no decision to a member who may not edit the list', () => {
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[makeDocumentUpload()]}
            />,
        );

        // Le front masque, le serveur refuse : le téléchargement reste ouvert.
        expect(
            screen.queryByRole('button', { name: 'Valider passeport.pdf' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Refuser passeport.pdf' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Télécharger passeport.pdf' }),
        ).toBeInTheDocument();
    });
});
