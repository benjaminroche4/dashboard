import { beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` est hoisté : ses dépendances passent par `vi.hoisted`.
const { notify, loaded, added } = vi.hoisted(() => ({
    notify: {
        loading: vi.fn(() => 'toast-1'),
        resolve: vi.fn(),
        reject: vi.fn(),
        warning: vi.fn(),
    },
    /** pdf-lib simulé : on observe l'ordre des documents fusionnés. */
    loaded: [] as string[],
    added: [] as string[],
}));

vi.mock('@/lib/toast', () => ({ notify }));

vi.mock('pdf-lib', () => ({
    PDFDocument: {
        create: vi.fn(() =>
            Promise.resolve({
                setTitle: vi.fn(),
                setCreator: vi.fn(),
                copyPages: (source: { name: string }) => {
                    added.push(source.name);

                    return Promise.resolve([{ page: source.name }]);
                },
                addPage: vi.fn(),
                save: () => Promise.resolve(new Uint8Array([1, 2, 3])),
            }),
        ),
        load: vi.fn((bytes: ArrayBuffer) => {
            const name = new TextDecoder().decode(bytes);
            loaded.push(name);

            if (name === 'casse') {
                return Promise.reject(new Error('PDF illisible'));
            }

            return Promise.resolve({
                name,
                getPageIndices: () => [0],
            });
        }),
    },
}));

import { mergeDossierPdf } from '@/lib/merge-dossier-pdf';
import {
    makeDocumentRequestDetail,
    makeDocumentUpload,
} from '@/test/fixtures/document-request';

/** Liste d'un locataire avec deux pièces déposées. */
const request = (files: { name: string; url: string }[]) =>
    makeDocumentRequestDetail({
        name: 'Léa Martin',
        uploads_count: files.length,
        persons: [
            {
                name: 'Léa Martin',
                role: 'Locataire',
                categories: [
                    {
                        value: 'identity',
                        label: 'Identité',
                        documents: files.map((file, index) => ({
                            key: `piece-${index}`,
                            label: `Pièce ${index}`,
                            hint: null,
                            uploads: [
                                makeDocumentUpload({
                                    id: index + 1,
                                    name: file.name,
                                    download_url: file.url,
                                }),
                            ],
                        })),
                    },
                ],
            },
        ],
    });

const body = (text: string) => ({
    ok: true,
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(text).buffer),
});

describe('mergeDossierPdf', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        loaded.length = 0;
        added.length = 0;
        URL.createObjectURL = vi.fn(() => 'blob:dossier');
        URL.revokeObjectURL = vi.fn();
    });

    it('merges the cover then every piece, in order, and downloads the file', async () => {
        const fetchMock = vi.fn((url: string) =>
            Promise.resolve(
                url.includes('/cover') ? body('garde') : body(`fichier:${url}`),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');

        const result = await mergeDossierPdf(
            request([
                { name: 'cni.pdf', url: '/u/1' },
                { name: 'rib.pdf', url: '/u/2' },
            ]),
        );

        expect(result).toEqual({ merged: 2, skipped: [] });
        // La page de garde d'abord, puis les pièces dans l'ordre du dossier.
        expect(loaded).toEqual(['garde', 'fichier:/u/1', 'fichier:/u/2']);
        expect(added).toEqual(['garde', 'fichier:/u/1', 'fichier:/u/2']);
        expect(click).toHaveBeenCalled();
        expect(notify.resolve).toHaveBeenCalledWith(
            'toast-1',
            'Dossier de 2 pièce(s) téléchargé.',
            undefined,
        );
    });

    it('skips a broken file, names it, and still delivers the others', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                Promise.resolve(url === '/u/1' ? body('casse') : body('bon')),
            ),
        );

        const result = await mergeDossierPdf(
            request([
                { name: 'cni.pdf', url: '/u/1' },
                { name: 'rib.pdf', url: '/u/2' },
            ]),
            { withCover: false },
        );

        expect(result?.merged).toBe(1);
        expect(result?.skipped).toEqual(['Léa Martin · Pièce 0 (cni.pdf)']);
        expect(notify.resolve).toHaveBeenCalledWith(
            'toast-1',
            'Dossier de 1 pièce(s) téléchargé.',
            expect.stringContaining('cni.pdf'),
        );
    });

    it('says so when nothing has been deposited, without asking the server', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        expect(await mergeDossierPdf(makeDocumentRequestDetail())).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(notify.warning).toHaveBeenCalled();
    });

    it('says the pieces were all refused, rather than pretending nothing arrived', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const detail = request([{ name: 'cni.pdf', url: '/uploads/1' }]);
        detail.persons[0]!.categories[0]!.documents[0]!.uploads = [
            makeDocumentUpload({
                id: 1,
                name: 'cni.pdf',
                status: 'refused',
                status_label: 'Refusée',
            }),
        ];

        expect(await mergeDossierPdf(detail)).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(notify.warning).toHaveBeenCalledWith(
            'Aucune pièce à fusionner',
            'Toutes les pièces déposées ont été refusées.',
        );
    });

    it('goes on without the cover page when it cannot be rendered', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                url.includes('/cover')
                    ? Promise.resolve({ ok: false })
                    : Promise.resolve(body('bon')),
            ),
        );

        const result = await mergeDossierPdf(
            request([{ name: 'cni.pdf', url: '/u/1' }]),
        );

        expect(result?.merged).toBe(1);
        expect(loaded).toEqual(['bon']);
    });
});
