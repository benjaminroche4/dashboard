import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LeadAiCheck } from '@/components/leads/lead-ai-check';
import { makeVerdict } from '@/test/fixtures/lead';

describe('LeadAiCheck', () => {
    it('shows a green « Qualifié » verdict with its reason, without any button: the menu re-runs it', () => {
        render(<LeadAiCheck verdict={makeVerdict()} />);

        const card = screen.getByRole('region', { name: 'AI check' });
        expect(card).toHaveAttribute('data-verdict', 'qualified');
        expect(card).toHaveClass('bg-emerald-50/70');
        expect(card).toHaveTextContent('Qualifié');
        expect(card).toHaveTextContent(
            'Projet précis, budget réaliste et arrivée proche.',
        );

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('turns red when the lead is not qualified', () => {
        render(
            <LeadAiCheck
                verdict={makeVerdict({
                    value: 'not_qualified',
                    label: 'Non qualifié',
                    reason: 'Demande d’achat, hors cible.',
                })}
            />,
        );

        const card = screen.getByRole('region', { name: 'AI check' });
        expect(card).toHaveAttribute('data-verdict', 'not_qualified');
        expect(card).toHaveClass('bg-red-50/70');
        expect(card).toHaveTextContent('Non qualifié');
    });

    it('stays grey « À vérifier » when the assistant could not decide', () => {
        render(
            <LeadAiCheck
                verdict={makeVerdict({
                    value: 'neutral',
                    label: 'À vérifier',
                    reason: 'Message trop court pour juger.',
                })}
            />,
        );

        const card = screen.getByRole('region', { name: 'AI check' });
        expect(card).toHaveAttribute('data-verdict', 'neutral');
        expect(card).toHaveClass('bg-sidebar');
        expect(card).toHaveTextContent('À vérifier');
    });

    it('offers the next move: archive on a red verdict, plan the first contact on a green one', async () => {
        const user = userEvent.setup();
        const onArchive = vi.fn();
        const onPlan = vi.fn();
        const { rerender } = render(
            <LeadAiCheck
                verdict={makeVerdict({
                    value: 'not_qualified',
                    label: 'Non qualifié',
                })}
                onArchive={onArchive}
                onPlan={onPlan}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Archiver avec ce motif' }),
        );
        expect(onArchive).toHaveBeenCalledOnce();
        expect(
            screen.queryByRole('button', {
                name: 'Planifier le premier contact',
            }),
        ).toBeNull();

        rerender(
            <LeadAiCheck
                verdict={makeVerdict()}
                onArchive={onArchive}
                onPlan={onPlan}
            />,
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Planifier le premier contact',
            }),
        );
        expect(onPlan).toHaveBeenCalledOnce();
        expect(
            screen.queryByRole('button', { name: 'Archiver avec ce motif' }),
        ).toBeNull();
    });

    it('shows nothing at all while the assistant has not rendered a verdict', () => {
        const { container } = render(<LeadAiCheck verdict={null} />);
        expect(container).toBeEmptyDOMElement();
    });
});
