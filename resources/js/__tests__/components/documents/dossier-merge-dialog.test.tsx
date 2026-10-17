import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { DossierMergeDialog } from '@/components/documents/dossier-merge-dialog';
import {
    makeDocumentRequestDetail,
    makeDossierBrief,
} from '@/test/fixtures/document-request';

describe('DossierMergeDialog', () => {
    it('generates the synthesis by default, on an incomplete dossier too, and says what is missing', async () => {
        const user = userEvent.setup();
        const onMergeNow = vi.fn();
        const onOpenChange = vi.fn();
        render(
            <DossierMergeDialog
                request={makeDocumentRequestDetail({
                    valid_uploads_count: 3,
                    is_complete: false,
                    missing_count: 2,
                })}
                open
                onOpenChange={onOpenChange}
                onMergeNow={onMergeNow}
            />,
        );

        const dialog = screen.getByRole('dialog', { name: 'Dossier fusionné' });
        expect(dialog).toHaveTextContent(
            '3 pièce(s) validée(s), 2 encore attendue(s)',
        );
        expect(
            screen.getByRole('checkbox', { name: /Générer une synthèse IA/ }),
        ).toBeChecked();

        await user.click(
            screen.getByRole('button', { name: 'Générer puis télécharger' }),
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/brief'),
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(onMergeNow).not.toHaveBeenCalled();
    });

    it('merges at once without the synthesis when unchecked', async () => {
        const user = userEvent.setup();
        const onMergeNow = vi.fn();
        const onOpenChange = vi.fn();
        post.mockClear();
        render(
            <DossierMergeDialog
                request={makeDocumentRequestDetail({ valid_uploads_count: 2 })}
                open
                onOpenChange={onOpenChange}
                onMergeNow={onMergeNow}
            />,
        );

        await user.click(
            screen.getByRole('checkbox', { name: /Générer une synthèse IA/ }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Télécharger sans synthèse' }),
        );
        expect(onMergeNow).toHaveBeenCalledWith(false);
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(post).not.toHaveBeenCalled();
    });

    it('confirms a fresh synthesis and merges with it, without generating again', async () => {
        const user = userEvent.setup();
        const onMergeNow = vi.fn();
        post.mockClear();
        render(
            <DossierMergeDialog
                request={makeDocumentRequestDetail({
                    valid_uploads_count: 2,
                    brief: makeDossierBrief({
                        generated_at: '2026-10-17T10:00:00+02:00',
                    }),
                })}
                open
                onOpenChange={vi.fn()}
                onMergeNow={onMergeNow}
            />,
        );

        expect(
            screen.getByRole('checkbox', {
                name: /Inclure la page de garde IA/,
            }),
        ).toBeChecked();
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Synthèse du 17 octobre, à jour des pièces validées',
        );
        await user.click(screen.getByRole('button', { name: 'Télécharger' }));
        expect(onMergeNow).toHaveBeenCalledWith(true);
        expect(post).not.toHaveBeenCalled();
    });

    it('forces a full regeneration on demand, even when the synthesis is fresh', async () => {
        const user = userEvent.setup();
        const onMergeNow = vi.fn();
        post.mockClear();
        render(
            <DossierMergeDialog
                request={makeDocumentRequestDetail({
                    valid_uploads_count: 2,
                    brief: makeDossierBrief(),
                })}
                open
                onOpenChange={vi.fn()}
                onMergeNow={onMergeNow}
            />,
        );

        await user.click(
            screen.getByRole('checkbox', { name: /Forcer la régénération/ }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Régénérer puis télécharger' }),
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/brief'),
            { force: true },
            expect.anything(),
        );
        expect(onMergeNow).not.toHaveBeenCalled();
    });

    it('does not offer to force anything before a first synthesis exists', () => {
        render(
            <DossierMergeDialog
                request={makeDocumentRequestDetail({ valid_uploads_count: 2 })}
                open
                onOpenChange={vi.fn()}
                onMergeNow={vi.fn()}
            />,
        );

        expect(
            screen.queryByRole('checkbox', { name: /Forcer la régénération/ }),
        ).not.toBeInTheDocument();
    });

    it('speaks of an update when a synthesis exists but the files changed', () => {
        render(
            <DossierMergeDialog
                request={makeDocumentRequestDetail({
                    valid_uploads_count: 2,
                    brief: makeDossierBrief({
                        fresh: false,
                        generated_at: '2026-10-17T10:00:00+02:00',
                    }),
                })}
                open
                onOpenChange={vi.fn()}
                onMergeNow={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('checkbox', {
                name: /Mettre à jour la synthèse IA/,
            }),
        ).toBeChecked();
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'depuis la synthèse du 17 octobre : seules les parties modifiées sont relues',
        );
        expect(
            screen.getByRole('button', {
                name: 'Mettre à jour puis télécharger',
            }),
        ).toBeInTheDocument();
    });
});
