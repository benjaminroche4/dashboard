import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountryFlag } from '@/components/country-flag';

describe('CountryFlag', () => {
    it('renders a round SVG flag for an ISO code', () => {
        const { container } = render(<CountryFlag code="CH" />);
        const flag = container.firstElementChild;

        expect(flag).toHaveClass('fi', 'fis', 'fi-ch', 'rounded-full');
        expect(flag).toHaveAttribute('data-country', 'CH');
    });

    it('falls back to a globe for unknown countries', () => {
        const { container } = render(<CountryFlag code={null} />);

        expect(container.querySelector('[data-country]')).toBeNull();
        expect(container.querySelector('svg')).not.toBeNull();
    });
});
