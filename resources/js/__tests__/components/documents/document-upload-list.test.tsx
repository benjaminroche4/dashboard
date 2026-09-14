import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, del, post } = vi.hoisted(() => ({
    patch: vi.fn(),
    del: vi.fn(),
    post: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { patch, delete: del, post },
    usePage: () => ({ props: { features: { assistant: true } } }),
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
        // La carte du fichier, c'est la ligne elle-même : elle porte la teinte.
        expect(item).toHaveClass('bg-green-50');
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
        expect(item).toHaveClass('bg-red-50');
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

    it('opens a document in the page instead of downloading it', async () => {
        const user = userEvent.setup();
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[makeDocumentUpload()]}
                canReview
            />,
        );

        await user.click(screen.getByRole('button', { name: 'passeport.pdf' }));

        const viewer = within(await screen.findByRole('dialog'));
        expect(viewer.getByTitle('Aperçu de passeport.pdf')).toHaveAttribute(
            'src',
            `${reviewUrl}/apercu`,
        );
        // Le téléchargement reste à portée, il n'est plus le seul chemin.
        expect(
            viewer.getByRole('link', { name: 'Télécharger' }),
        ).toHaveAttribute('href', expect.stringContaining(reviewUrl));
    });

    it('shows the assistant proposal and applies it in one click', async () => {
        const user = userEvent.setup();
        const proposal = makeDocumentUpload({
            ai_review: {
                document_type: 'Passeport italien',
                matches_request: true,
                verdict: 'refused',
                reason: 'Le passeport a expiré le 12/03/2026 : déposez un titre en cours de validité.',
                holder_name: 'Léa Durand',
                document_date: null,
                expires_at: '2026-03-12',
                profile: { nationality: 'Italienne' },
            },
            can_apply_profile: true,
        });
        const { unmount } = render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[proposal]}
                canReview
            />,
        );

        const note = screen.getByRole('note', {
            name: 'Proposition de l’assistant pour passeport.pdf',
        });
        expect(note).toHaveTextContent('À redéposer');
        expect(note).toHaveTextContent('Passeport italien');
        expect(note).toHaveTextContent('expire le 2026-03-12');

        // Le motif proposé devient celui du refus, lu par le client.
        await user.click(
            within(note).getByRole('button', { name: 'Refuser avec ce motif' }),
        );
        expect(patch).toHaveBeenCalledWith(
            reviewUrl,
            {
                status: 'refused',
                note: 'Le passeport a expiré le 12/03/2026 : déposez un titre en cours de validité.',
            },
            expect.objectContaining({ preserveScroll: true }),
        );

        // Le premier envoi laisse le composant occupé jusqu'à la réponse :
        // on repart d'un rendu neuf pour le second bouton.
        unmount();
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[proposal]}
                canReview
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Reporter sur la fiche' }),
        );
        expect(post).toHaveBeenCalledWith(
            `${reviewUrl}/profile`,
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('lets a member ask the assistant to read a document', async () => {
        const user = userEvent.setup();
        render(
            <DocumentUploadList
                requestUuid={requestUuid}
                uploads={[makeDocumentUpload()]}
                canReview
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Relire passeport.pdf avec l’assistant',
            }),
        );
        expect(post).toHaveBeenCalledWith(
            `${reviewUrl}/analyze`,
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
