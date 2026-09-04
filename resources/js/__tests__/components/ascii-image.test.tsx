import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AsciiImage from '@/components/ascii-image';

// jsdom n'a pas de WebGL : le composant doit retomber sur l'image brute.
describe('AsciiImage', () => {
    it('renders the raw image plus a canvas overlay', () => {
        const { container } = render(
            <AsciiImage
                src="/images/login.jpg"
                alt="Paris"
                className="rounded-3xl"
            />,
        );

        const image = container.querySelector('img');
        const canvas = container.querySelector('canvas');

        expect(image).toHaveAttribute('src', '/images/login.jpg');
        expect(image).toHaveAttribute('alt', 'Paris');
        expect(canvas).toHaveAttribute('aria-hidden', 'true');
        expect(container.firstElementChild).toHaveClass(
            'rounded-3xl',
            'overflow-hidden',
        );
    });

    it('keeps the raw image visible while WebGL is unavailable', () => {
        const { container } = render(<AsciiImage src="/images/login.jpg" />);

        expect(container.querySelector('img')).not.toHaveClass('opacity-0');
        expect(container.querySelector('canvas')).toHaveClass('opacity-0');
    });
});
