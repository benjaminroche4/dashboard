import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post, on: () => () => undefined },
    usePage: () => ({ props: { errors: {} } }),
}));

vi.mock('@/lib/toast', () => ({
    notify: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

import PublicDocumentUpload, {
    uploadProgress,
} from '@/pages/public/document-upload';
import { makePublicPerson } from '@/test/fixtures/document-request';

const labels = {
    title: 'Vos pièces justificatives',
    intro: 'Merci de réunir les pièces ci-dessous.',
    drop: 'Déposez vos fichiers ici ou cliquez pour les choisir',
    formats: 'PDF uniquement · 10 Mo par fichier',
    uploaded: 'Fichiers reçus',
    none: 'Aucun fichier pour le moment',
    sending: 'Envoi en cours…',
    done: 'Pièce reçue',
    contact: 'Une question ? Écrivez-nous :',
    privacy: 'Vos fichiers sont transmis de façon sécurisée.',
    progress: ':done pièce(s) reçue(s) sur :total',
};

function renderPage() {
    return render(
        <PublicDocumentUpload
            request={{
                name: 'Léa Martin',
                language: 'fr',
                message: 'Avant le 15 si possible.',
                persons: [makePublicPerson()],
            }}
            uploadUrl="/depot/tok-abc"
            company={{
                name: 'Relocation In Paris',
                email: 'contact@example.com',
                phone: '+33 1 00 00 00 00',
            }}
            labels={labels}
        />,
    );
}

describe('uploadProgress', () => {
    it('counts the documents with at least one file', () => {
        expect(uploadProgress([makePublicPerson()])).toEqual({
            done: 1,
            total: 2,
        });
        expect(uploadProgress([])).toEqual({ done: 0, total: 0 });
    });
});

describe('Public document upload page', () => {
    it('shows the person, the documents, the received files, the progress and one dropzone per document', () => {
        renderPage();

        expect(
            screen.getByRole('heading', { name: 'Vos pièces justificatives' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Léa Martin' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Avant le 15 si possible.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(
            '1 pièce(s) reçue(s) sur 2',
        );
        expect(
            screen.getByText("Passeport ou carte d'identité"),
        ).toBeInTheDocument();
        expect(screen.getByText('Pièce reçue')).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('list', {
                    name: 'Fichiers reçus · 3 derniers bulletins de salaire',
                }),
            ).getByText('bulletin-juin.pdf'),
        ).toBeInTheDocument();
        expect(screen.getAllByText(labels.drop)).toHaveLength(2);
        expect(
            screen.getByRole('link', { name: 'contact@example.com' }),
        ).toHaveAttribute('href', 'mailto:contact@example.com');
    });

    it('posts the dropped files as multipart for the right person and document', async () => {
        const user = userEvent.setup();
        renderPage();

        const file = new File(['x'], 'passeport.pdf', {
            type: 'application/pdf',
        });
        const inputs = document.querySelectorAll('input[type="file"]');
        await user.upload(inputs[0] as HTMLInputElement, file);

        expect(post).toHaveBeenCalledWith(
            '/depot/tok-abc',
            { person: 0, document: 'id_document', files: [file] },
            expect.objectContaining({
                forceFormData: true,
                preserveScroll: true,
            }),
        );
    });
});
