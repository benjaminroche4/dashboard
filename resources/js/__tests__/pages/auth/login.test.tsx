import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/passkey-verify', () => ({
    default: () => <div data-testid="passkey-verify" />,
}));

// Inertia's <Head> and <Form> need a page context that only exists at runtime,
// so we replace them with minimal stand-ins to test the page in isolation.
vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
    Form: ({
        children,
        className,
    }: {
        children: (state: {
            processing: boolean;
            errors: Record<string, string>;
        }) => React.ReactNode;
        className?: string;
    }) => (
        <form className={className}>
            {children({ processing: false, errors: {} })}
        </form>
    ),
}));

import Login from '@/pages/auth/login';

describe('Login page', () => {
    it('renders the email, password and remember fields', () => {
        render(<Login />);

        expect(screen.getByLabelText('Email address')).toBeRequired();
        expect(screen.getByLabelText('Password')).toBeRequired();
        expect(screen.getByLabelText('Remember me')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Log in' }),
        ).toBeInTheDocument();
    });

    it('does not offer registration or password reset', () => {
        render(<Login />);

        expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
        expect(
            screen.queryByText(/forgot your password/i),
        ).not.toBeInTheDocument();
    });

    it('shows the status message when provided', () => {
        render(<Login status="Session expired" />);

        expect(screen.getByText('Session expired')).toBeInTheDocument();
    });

    it('offers passkey login', () => {
        render(<Login />);

        expect(screen.getByTestId('passkey-verify')).toBeInTheDocument();
    });
});
