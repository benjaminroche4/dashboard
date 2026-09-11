import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfferBadge, offerTones } from '@/components/clients/offer-badge';

describe('OfferBadge', () => {
    it('tints the two offers differently, but keeps both discreet', () => {
        expect(offerTones.accompagne).not.toBe(offerTones.confie);

        for (const tone of Object.values(offerTones)) {
            // Fond très clair et texte foncé : lisible sans crier.
            expect(tone).toMatch(/-50 /);
            expect(tone).toMatch(/dark:/);
        }
    });

    it('shows each label with its tint, and a dash without an offer', () => {
        const { rerender } = render(
            <OfferBadge offer="accompagne" label="Accompagné" />,
        );
        expect(screen.getByText('Accompagné').className).toContain('sky');

        rerender(<OfferBadge offer="confie" label="Confié" />);
        expect(screen.getByText('Confié').className).toContain('indigo');

        rerender(<OfferBadge offer={null} label={null} />);
        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
