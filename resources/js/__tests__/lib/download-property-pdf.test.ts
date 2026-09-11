import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loading, resolve, reject } = vi.hoisted(() => ({
    loading: vi.fn(() => 'toast-1'),
    resolve: vi.fn(),
    reject: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { loading, resolve, reject } }));

import { downloadPropertyPdf } from '@/lib/download-property-pdf';

describe('downloadPropertyPdf', () => {
    beforeEach(() => {
        loading.mockClear();
        resolve.mockClear();
        reject.mockClear();
        URL.createObjectURL = vi.fn(() => 'blob:pdf');
        URL.revokeObjectURL = vi.fn();
    });

    it('downloads the file under a readable name', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            blob: async () => new Blob(['%PDF']),
        }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(
            downloadPropertyPdf('uuid-1', 'T2 lumineux · 11e'),
        ).resolves.toBe(true);

        expect(fetchMock).toHaveBeenCalledWith(
            '/properties/uuid-1/pdf',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(resolve).toHaveBeenCalledWith('toast-1', 'PDF téléchargé.');
    });

    it('warns when the generation fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false, status: 500 })),
        );

        await expect(downloadPropertyPdf('uuid-1', 'T2')).resolves.toBe(false);
        expect(reject).toHaveBeenCalled();
    });
});
