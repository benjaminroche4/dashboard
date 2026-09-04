import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShimmerLogo from '@/components/shimmer-logo';

describe('ShimmerLogo', () => {
    it('wraps the logo in the shimmer utility', () => {
        render(<ShimmerLogo src="/images/logo.jpg" />);
        const logo = screen.getByAltText('Dashboard');

        expect(logo).toHaveAttribute('src', '/images/logo.jpg');
        expect(logo).toHaveClass('size-10', 'rounded-md');
        expect(logo.parentElement).toHaveClass('shimmer-logo', 'rounded-md');
    });
});
