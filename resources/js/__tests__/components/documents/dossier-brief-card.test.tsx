import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { DossierBriefCard } from '@/components/documents/dossier-brief-card';
import {
    makeDocumentRequestDetail,
    makeDossierBrief,
} from '@/test/fixtures/document-request';

const complete = (overrides = {}) =>
    makeDocumentRequestDetail({
        is_complete: true,
        missing_count: 0,
        ...overrides,
    });

describe('DossierBriefCard', () => {
    it('waits for every piece to be validated before offering to prepare the dossier', () => {
        render(
            <DossierBriefCard
                request={makeDocumentRequestDetail({
                    is_complete: false,
                    missing_count: 3,
                })}
                canUpdate
                assistant
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            '3 pièce(s) encore sans fichier validé',
        );
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('asks the server to prepare a complete dossier', async () => {
        const user = userEvent.setup();
        render(<DossierBriefCard request={complete()} canUpdate assistant />);

        await user.click(
            screen.getByRole('button', {
                name: 'Préparer le dossier avec l’IA',
            }),
        );

        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/brief'),
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('shows the reading in progress, without a second button', () => {
        render(
            <DossierBriefCard
                request={complete({
                    brief: makeDossierBrief({ pending: true, cover: null }),
                })}
                canUpdate
                assistant
            />,
        );

        expect(
            screen.getByText(/L’assistant lit les pièces/),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('presents the cover and the sheets, and flags a synthesis the files have outgrown', () => {
        const { unmount } = render(
            <DossierBriefCard
                request={complete({ brief: makeDossierBrief() })}
                canUpdate
                assistant
            />,
        );

        expect(screen.getByText('Dossier préparé')).toBeInTheDocument();
        expect(
            screen.getByText('Revenus : 4 150 € nets par mois'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('list', { name: 'Points forts' }),
        ).toHaveTextContent('Taux d’effort : 30 %');
        // Trois cartes : les salaires détaillés par locataire, l'épargne absente le dit.
        const figures = screen.getByLabelText('Chiffres du foyer');
        expect(figures.querySelectorAll('dt')).toHaveLength(3);
        expect(figures).toHaveTextContent('Salaires7 350 € nets / mois');
        expect(figures).toHaveTextContent('Léa Martin4 150 €');
        expect(figures).toHaveTextContent('Paul Martin3 200 €');
        expect(figures).toHaveTextContent('Imposition78 400 €');
        expect(figures).toHaveTextContent('ÉpargneNon renseigné');
        expect(
            screen.getByRole('list', { name: 'Fiches récapitulatives' }),
        ).toHaveTextContent('Revenus et salaires · Léa Martin');
        expect(
            screen.getByRole('button', { name: 'Préparer de nouveau' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByText('Pièces modifiées depuis'),
        ).not.toBeInTheDocument();
        unmount();

        render(
            <DossierBriefCard
                request={complete({
                    brief: makeDossierBrief({ fresh: false }),
                })}
                canUpdate
                assistant
            />,
        );
        expect(screen.getByText('Pièces modifiées depuis')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(
            'part sans fiches',
        );
    });

    it('explains the missing key, and hides the button from a reader', () => {
        const { unmount } = render(
            <DossierBriefCard
                request={complete()}
                canUpdate
                assistant={false}
            />,
        );
        expect(screen.getByRole('status')).toHaveTextContent(
            'Assistant IA non configuré',
        );
        unmount();

        render(
            <DossierBriefCard
                request={complete()}
                canUpdate={false}
                assistant
            />,
        );
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
