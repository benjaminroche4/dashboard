import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentPreviewDialog } from '@/components/documents/document-preview-dialog';

const file = {
    name: 'cni.pdf',
    url: '/tools/documents/req-1/uploads/up-1/apercu',
    downloadUrl: '/tools/documents/req-1/uploads/up-1',
};

describe('DocumentPreviewDialog', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reads the file itself and frames a local blob, never the page address', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: () => Promise.resolve(new Blob(['%PDF-1.7'])),
        });
        vi.stubGlobal('fetch', fetchMock);
        const createObjectURL = vi.fn(() => 'blob:mock-cni');
        const revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL,
            revokeObjectURL,
        });

        const { unmount } = render(
            <DocumentPreviewDialog file={file} onOpenChange={vi.fn()} />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Chargement de l’aperçu…',
        );
        const frame = await screen.findByTitle('Aperçu de cni.pdf');
        // En production, la plateforme pose `X-Frame-Options: deny` : le
        // cadre ne charge donc jamais l'adresse de la page, seulement le blob.
        expect(frame).toHaveAttribute('src', 'blob:mock-cni');
        expect(fetchMock).toHaveBeenCalledWith(
            file.url,
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(
            screen.getByRole('link', { name: 'Ouvrir dans un onglet' }),
        ).toHaveAttribute('href', file.url);

        unmount();
        await waitFor(() =>
            expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-cni'),
        );
    });

    it('says so when the file cannot be read, and keeps the tab link', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 403 }),
        );

        render(<DocumentPreviewDialog file={file} onOpenChange={vi.fn()} />);

        expect(await screen.findByRole('status')).toHaveTextContent(
            'L’aperçu n’a pas pu être chargé',
        );
        expect(
            screen.queryByTitle('Aperçu de cni.pdf'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Ouvrir dans un onglet' }),
        ).toBeInTheDocument();
    });
});
