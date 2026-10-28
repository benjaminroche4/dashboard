import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClampedText, needsClamp } from '@/components/clamped-text';

describe('ClampedText', () => {
    it('shows a short text as is, without a toggle', () => {
        render(<ClampedText text="Courte note." />);

        expect(screen.getByText('Courte note.')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
        expect(needsClamp('Courte note.')).toBe(false);
    });

    it('folds a long text behind « Voir plus » and unfolds it on click', async () => {
        const user = userEvent.setup();
        const text = 'Une note très longue. '.repeat(40);
        render(<ClampedText text={text} />);

        const toggle = screen.getByRole('button', { name: 'Voir plus' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByText(text.trim())).toHaveClass('line-clamp-6');

        await user.click(toggle);
        expect(
            screen.getByRole('button', { name: 'Voir moins' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText(text.trim())).not.toHaveClass('line-clamp-6');
    });

    it('folds on line count too, and renders enriched children against the raw text', () => {
        const text = Array.from({ length: 8 }, (_, i) => `ligne ${i}`).join(
            '\n',
        );
        render(
            <ClampedText text={text}>
                <strong>enrichi</strong>
            </ClampedText>,
        );

        expect(needsClamp(text)).toBe(true);
        expect(screen.getByText('enrichi')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Voir plus' }),
        ).toBeInTheDocument();
    });

    it('does not let the toggle click reach a wrapping button (inline field)', async () => {
        const user = userEvent.setup();
        const outer = vi.fn();
        render(
            <button type="button" onClick={outer}>
                <ClampedText text={'x'.repeat(500)} />
            </button>,
        );

        await user.click(screen.getByRole('button', { name: 'Voir plus' }));
        expect(outer).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Voir moins' }),
        ).toBeInTheDocument();
    });
});
