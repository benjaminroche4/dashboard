import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FirstContactBadge } from '@/components/leads/first-contact-badge';
import { firstContactTimer } from '@/lib/lead-urgency';
import { makeLead } from '@/test/fixtures/lead';

const lead = makeLead({
    status: 'todo',
    created_at: '2026-09-10T12:00:00Z',
    last_contacted_at: null,
});

describe('FirstContactBadge', () => {
    it('ne rend rien sans compte à rebours', () => {
        const { container } = render(<FirstContactBadge timer={null} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('affiche le temps restant en ambre', () => {
        render(
            <FirstContactBadge
                timer={firstContactTimer(
                    lead,
                    new Date('2026-09-10T12:05:00Z'),
                )}
            />,
        );

        const badge = screen.getByRole('timer');
        expect(badge).toHaveTextContent('À contacter · 25:00');
        expect(badge).toHaveAttribute('data-late', 'false');
    });

    it('signale le retard en rouge', () => {
        render(
            <FirstContactBadge
                timer={firstContactTimer(
                    lead,
                    new Date('2026-09-10T12:40:00Z'),
                )}
            />,
        );

        const badge = screen.getByRole('timer');
        expect(badge).toHaveTextContent('En retard · +10:00');
        expect(badge).toHaveAttribute('data-late', 'true');
    });
});
