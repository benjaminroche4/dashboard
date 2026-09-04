import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InputError from '@/components/input-error';

describe('InputError', () => {
    it('renders nothing without a message', () => {
        const { container } = render(<InputError />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders the message when provided', () => {
        render(<InputError message="Email is required" />);

        expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('applies extra class names', () => {
        render(<InputError message="Oops" className="mt-2" />);

        expect(screen.getByText('Oops')).toHaveClass('mt-2');
    });
});
