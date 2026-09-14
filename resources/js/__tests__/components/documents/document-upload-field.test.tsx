import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { DocumentUploadField } from '@/components/documents/document-upload-field';

describe('DocumentUploadField', () => {
    it('sends the chosen PDF at once, as a multipart post for that person and piece', async () => {
        const user = userEvent.setup();
        render(
            <DocumentUploadField
                requestUuid="req-1"
                personIndex={1}
                documentKey="payslips"
                label="3 derniers bulletins de salaire"
            />,
        );

        const file = new File(['%PDF-1.7'], 'fiche-paie.pdf', {
            type: 'application/pdf',
        });
        const input = document.querySelector(
            'input[type="file"]',
        ) as HTMLInputElement;
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
});
