import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
}));

import {
    DossierReadinessCard,
    DossierReadinessStat,
    readinessSummary,
} from '@/components/clients/dossier-readiness';
import { makeDossierReadiness } from '@/test/fixtures/client';

describe('readinessSummary', () => {
    it('says what is blocking, missing pieces first', () => {
        expect(
            readinessSummary(
                makeDossierReadiness({
                    status: 'incomplete',
                    total: 6,
                    accepted: 2,
                    to_check: 1,
                    refused: 1,
                    missing: 2,
                    percent: 33,
                }),
            ),
        ).toBe('2 manquantes · 1 à redéposer · 1 à vérifier');
    });

    it('says the dossier is complete when nothing is left', () => {
        expect(readinessSummary(makeDossierReadiness())).toBe(
            '6 pièces validées',
        );
        expect(
            readinessSummary(makeDossierReadiness({ status: 'not_started' })),
        ).toBe('Aucune liste de pièces');
    });
});

describe('DossierReadinessStat', () => {
    it('shows the state, the share of approved pieces and what remains', () => {
        render(<DossierReadinessStat readiness={makeDossierReadiness()} />);

        expect(screen.getByText('Prêt')).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', { name: 'Pièces validées' }),
        ).toHaveAttribute('aria-valuenow', '100');
        expect(screen.getByText('6 pièces validées')).toBeInTheDocument();
    });

    it('has no progress bar while no list exists', () => {
        render(
            <DossierReadinessStat
                readiness={makeDossierReadiness({
                    status: 'not_started',
                    status_label: 'Pas commencé',
                    total: 0,
                    accepted: 0,
                    percent: 0,
                })}
            />,
        );

        expect(screen.getByText('Pas commencé')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });
});

describe('DossierReadinessCard', () => {
    it('details the pieces and opens the documents tab', async () => {
        const user = userEvent.setup();
        const openDocuments = vi.fn();
        render(
            <DossierReadinessCard
                readiness={makeDossierReadiness({
                    status: 'incomplete',
                    status_label: 'Incomplet',
                    total: 6,
                    accepted: 3,
                    to_check: 1,
                    refused: 1,
                    missing: 1,
                    percent: 50,
                })}
                leadUuid="lead-uuid"
                onOpenDocuments={openDocuments}
            />,
        );

        expect(screen.getByText('Incomplet')).toBeInTheDocument();
        expect(screen.getByText('3/6 pièces validées')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Voir les pièces' }),
        );
        expect(openDocuments).toHaveBeenCalled();
    });

    it('offers to create the list when the dossier has not started', () => {
        render(
            <DossierReadinessCard
                readiness={makeDossierReadiness({
                    status: 'not_started',
                    status_label: 'Pas commencé',
                    total: 0,
                    accepted: 0,
                    percent: 0,
                })}
                leadUuid="lead-uuid"
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Créer une liste de pièces' }),
        ).toHaveAttribute('href', expect.stringContaining('lead=lead-uuid'));
    });
});
