import { afterEach, describe, expect, it, vi } from 'vitest';

const { loading, success, error } = vi.hoisted(() => ({
    loading: vi.fn(() => 'toast-1'),
    success: vi.fn(),
    error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { loading, success, error } }));

import { downloadInvoicePdf } from '@/lib/download-invoice-pdf';

describe('downloadInvoicePdf', () => {
    afterEach(() => vi.restoreAllMocks());

    it('fetches the PDF, triggers the download and confirms with a toast', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                blob: async () => new Blob(['%PDF']),
            })),
        );
        URL.createObjectURL = vi.fn(() => 'blob:pdf');
        URL.revokeObjectURL = vi.fn();
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);

        await expect(downloadInvoicePdf(1, 'RP-27001')).resolves.toBe(true);

        expect(fetch).toHaveBeenCalledWith(
            '/invoices/1/pdf',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(click).toHaveBeenCalled();
        expect(loading).toHaveBeenCalledWith('Génération du PDF RP-27001…');
        expect(success).toHaveBeenCalledWith('PDF RP-27001 téléchargé.', {
            id: 'toast-1',
        });
        vi.unstubAllGlobals();
    });

    it('shows an error toast when the server fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false, status: 503 })),
        );

        await expect(downloadInvoicePdf(2, 'RP-27002')).resolves.toBe(false);

        expect(error).toHaveBeenCalledWith(
            expect.stringContaining('Impossible de générer le PDF RP-27002'),
            { id: 'toast-1' },
        );
        vi.unstubAllGlobals();
    });
});
