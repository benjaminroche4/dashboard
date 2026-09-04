import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShimmerBorder from '@/components/shimmer-border';

describe('ShimmerBorder', () => {
    it('wraps its content in an animated 1px frame', () => {
        const { container } = render(
            <ShimmerBorder radiusClassName="rounded-xl">
                <span>Logo</span>
            </ShimmerBorder>,
        );
        const frame = container.firstElementChild;

        expect(screen.getByText('Logo')).toBeInTheDocument();
        expect(frame).toHaveClass('p-px', 'overflow-hidden', 'rounded-xl');
        expect(frame?.className).toContain(
            'before:animate-[spin_3s_linear_infinite]',
        );
        expect(frame?.className).toContain('motion-reduce:before:animate-none');
        expect(frame?.firstElementChild).toHaveClass(
            'bg-background',
            'rounded-xl',
        );
    });
});
