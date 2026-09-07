import { afterEach, describe, expect, it, vi } from 'vitest';

const { loading, resolve, reject } = vi.hoisted(() => ({
    loading: vi.fn(() => 'toast-1'),
    resolve: vi.fn(),
    reject: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { loading, resolve, reject } }));

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

        await expect(
            downloadInvoicePdf(
                '0199a9a0-0000-7000-8000-000000000101',
                'RP-27001',
            ),
        ).resolves.toBe(true);

        expect(fetch).toHaveBeenCalledWith(
            '/invoices/0199a9a0-0000-7000-8000-000000000101/pdf',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(click).toHaveBeenCalled();
        expect(loading).toHaveBeenCalledWith(
            'Génération du PDF RP-27001…',
            expect.any(String),
        );
        expect(resolve).toHaveBeenCalledWith(
            'toast-1',
            'PDF RP-27001 téléchargé.',
        );
        vi.unstubAllGlobals();
    });

    it('shows an error toast when the server fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false, status: 503 })),
        );

        await expect(
            downloadInvoicePdf(
                '0199a9a0-0000-7000-8000-000000000102',
                'RP-27002',
            ),
        ).resolves.toBe(false);

        expect(reject).toHaveBeenCalledWith(
            'toast-1',
            'Impossible de générer le PDF RP-27002.',
            'Réessayez dans un instant.',
        );
        vi.unstubAllGlobals();
    });
});
