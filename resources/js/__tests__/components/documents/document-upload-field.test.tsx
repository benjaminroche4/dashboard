import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post, notify } = vi.hoisted(() => ({
    post: vi.fn(),
    notify: { error: vi.fn() },
}));

vi.mock('@inertiajs/react', () => ({ router: { post } }));
vi.mock('@/lib/toast', () => ({ notify }));

import { DocumentUploadField } from '@/components/documents/document-upload-field';

const file = new File(['%PDF-1.7'], 'fiche-paie.pdf', {
    type: 'application/pdf',
});

function renderField() {
    render(
        <DocumentUploadField
            requestUuid="req-1"
            personIndex={1}
            documentKey="payslips"
            label="3 derniers bulletins de salaire"
        />,
    );

    return document.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('DocumentUploadField', () => {
    it('sends the chosen PDF at once, as a multipart post for that person and piece', async () => {
        const user = userEvent.setup();
        const input = renderField();
        expect(input).toHaveAttribute('accept', 'application/pdf');

        await user.upload(input, file);

        expect(post).toHaveBeenCalledWith(
            '/tools/documents/req-1/uploads',
            { person: 1, document: 'payslips', files: [file] },
            expect.objectContaining({
                forceFormData: true,
                preserveScroll: true,
            }),
        );
        expect(
            screen.getByRole('button', {
                name: 'Ajouter un fichier pour 3 derniers bulletins de salaire',
            }),
        ).toBeDisabled();
    });

    it('tells why a file was refused instead of failing silently', async () => {
        const user = userEvent.setup();
        post.mockImplementation((_url, _data, options) => {
            options.onError({ 'files.0': 'Le fichier doit être un PDF.' });
            options.onFinish();
        });
        const input = renderField();

        await user.upload(input, file);

        expect(notify.error).toHaveBeenCalledWith(
            'Fichier non enregistré',
            'Le fichier doit être un PDF.',
        );
        // Prêt pour un nouvel essai.
        expect(
            screen.getByRole('button', { name: /Ajouter un fichier/ }),
        ).toBeEnabled();
    });
});
