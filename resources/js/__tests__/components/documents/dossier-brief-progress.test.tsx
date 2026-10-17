import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { reload } = vi.hoisted(() => ({ reload: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { reload } }));

import {
    DossierBriefProgress,
    PROGRESS_POLL_MS,
} from '@/components/documents/dossier-brief-progress';
import {
    makeDocumentRequestDetail,
    makeDossierBrief,
} from '@/test/fixtures/document-request';
import type { DossierBriefProgress as Progress } from '@/types';

const progress: Progress = {
    done: 1,
    total: 3,
    steps: [
        {
            key: '0-identity',
            label: 'Identité et séjour',
            person: 'Léa Martin',
            state: 'kept',
        },
        {
            key: '0-income',
            label: 'Revenus et salaires',
            person: 'Léa Martin',
            state: 'reading',
        },
        {
            key: 'cover',
            label: 'Page de garde',
            person: null,
            state: 'pending',
        },
    ],
};

const pending = () =>
    makeDocumentRequestDetail({
        brief: makeDossierBrief({ pending: true, cover: null, progress }),
    });

describe('DossierBriefProgress', () => {
    beforeEach(() => {
        reload.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('follows the synthesis step by step and polls the page while it runs', () => {
        vi.useFakeTimers();
        render(
            <DossierBriefProgress request={pending()} onDownload={vi.fn()} />,
        );

        const panel = screen.getByRole('status', { name: 'Synthèse IA' });
        expect(panel).toHaveTextContent('Synthèse IA en cours');
        expect(panel).toHaveTextContent('1/3');
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '1',
        );
        const steps = screen.getAllByRole('listitem');
        expect(steps).toHaveLength(3);
        expect(steps[0]).toHaveTextContent('Identité et séjour · Léa Martin');
        expect(steps[0]).toHaveTextContent('gardée');
        expect(steps[1]).toHaveTextContent('en lecture');
        expect(steps[2]).toHaveTextContent('Page de garde');
        expect(steps[2]).toHaveTextContent('à lire');

        act(() => {
            vi.advanceTimersByTime(PROGRESS_POLL_MS);
        });
        expect(reload).toHaveBeenCalledWith({ only: ['request'] });
    });

    it('offers the download once the synthesis lands, then closes on demand', async () => {
        const user = userEvent.setup();
        const onDownload = vi.fn();
        const { rerender } = render(
            <DossierBriefProgress
                request={pending()}
                onDownload={onDownload}
            />,
        );

        rerender(
            <DossierBriefProgress
                request={makeDocumentRequestDetail({
                    brief: makeDossierBrief(),
                })}
                onDownload={onDownload}
            />,
        );

        const panel = screen.getByRole('status', { name: 'Synthèse IA' });
        expect(panel).toHaveTextContent('Synthèse IA prête');
        await user.click(
            screen.getByRole('button', {
                name: 'Télécharger le dossier fusionné',
            }),
        );
        expect(onDownload).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'Fermer' }));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        // Plus rien à relire une fois la synthèse écrite : aucun appel depuis le rerender.
        expect(reload).not.toHaveBeenCalled();
    });

    it('stays hidden when nothing is running and nothing just finished', () => {
        render(
            <DossierBriefProgress
                request={makeDocumentRequestDetail({
                    brief: makeDossierBrief(),
                })}
                onDownload={vi.fn()}
            />,
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
