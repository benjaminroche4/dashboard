import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShimmerBorder from '@/components/shimmer-border';

describe('ShimmerBorder', () => {
    it('applies the shimmer utility and forwards the radius', () => {
        const { container } = render(
            <ShimmerBorder className="rounded-md">
                <span>Logo</span>
            </ShimmerBorder>,
        );

        expect(screen.getByText('Logo')).toBeInTheDocument();
        expect(container.firstElementChild).toHaveClass(
            'shimmer-border',
            'rounded-md',
        );
    });
});
