import { afterEach, describe, expect, it, vi } from 'vitest';

const { loading, resolve, reject } = vi.hoisted(() => ({
    loading: vi.fn(() => 'toast-1'),
    resolve: vi.fn(),
    reject: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { loading, resolve, reject } }));

import { downloadDocumentRequestPdf } from '@/lib/download-document-request-pdf';

describe('downloadDocumentRequestPdf', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        loading.mockClear();
        resolve.mockClear();
        reject.mockClear();
    });

    it('fetches the PDF, triggers a slugged download and resolves the toast', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(new Blob(['%PDF'])),
            }),
        );
        URL.createObjectURL = vi.fn(() => 'blob:pdf');
        URL.revokeObjectURL = vi.fn();
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);

        const ok = await downloadDocumentRequestPdf(7, 'Léa Martin');

        expect(ok).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
            '/tools/documents/7/pdf',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(click).toHaveBeenCalledOnce();
        expect(resolve).toHaveBeenCalledWith('toast-1', 'PDF téléchargé.');
    });

    it('rejects the toast when the server fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 500 }),
        );

        const ok = await downloadDocumentRequestPdf(7, 'Léa Martin');

        expect(ok).toBe(false);
        expect(reject).toHaveBeenCalledWith(
            'toast-1',
            'Impossible de générer le PDF.',
            'Réessayez dans un instant.',
        );
    });
});
