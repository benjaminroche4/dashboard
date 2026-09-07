import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge';

describe('QuoteStatusBadge', () => {
    it('renders the label with a status attribute and a colour per status', () => {
        render(<QuoteStatusBadge status="accepted" label="Accepté" />);

        const badge = screen.getByText('Accepté');
        expect(badge).toHaveAttribute('data-status', 'accepted');
        expect(badge.className).toContain('text-green-700');
    });
});
