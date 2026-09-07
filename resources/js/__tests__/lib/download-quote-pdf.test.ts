import { afterEach, describe, expect, it, vi } from 'vitest';

const { loading, resolve, reject } = vi.hoisted(() => ({
    loading: vi.fn(() => 'toast-1'),
    resolve: vi.fn(),
    reject: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { loading, resolve, reject } }));

import { downloadQuotePdf } from '@/lib/download-quote-pdf';

describe('downloadQuotePdf', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('fetches the PDF from the quotes route, downloads it and confirms with a toast', async () => {
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
            downloadQuotePdf(
                '0199a9a0-0000-7000-8000-00000000d001',
                'DV-27003',
            ),
        ).resolves.toBe(true);

        expect(fetch).toHaveBeenCalledWith(
            '/tools/quotes/0199a9a0-0000-7000-8000-00000000d001/pdf',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(click).toHaveBeenCalled();
        expect(loading).toHaveBeenCalledWith(
            'Génération du PDF DV-27003…',
            expect.any(String),
        );
        expect(resolve).toHaveBeenCalledWith(
            'toast-1',
            'PDF DV-27003 téléchargé.',
        );
    });

    it('shows an error toast when the server fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false, status: 503 })),
        );

        await expect(
            downloadQuotePdf(
                '0199a9a0-0000-7000-8000-00000000d001',
                'DV-27003',
            ),
        ).resolves.toBe(false);

        expect(reject).toHaveBeenCalledWith(
            'toast-1',
            'Impossible de générer le PDF DV-27003.',
            'Réessayez dans un instant.',
        );
    });
});
