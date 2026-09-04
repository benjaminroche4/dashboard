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

function renderVisible(props: { status?: string } = {}) {
    render(<Login {...props} />);

    return screen;
}

describe('Login page', () => {
    it('renders the email, password and remember fields', () => {
        const page = renderVisible();

        expect(page.getByLabelText('Adresse e-mail')).toBeRequired();
        expect(page.getByLabelText(/^Mot de passe$/)).toBeRequired();
        expect(page.getByLabelText('Se souvenir de moi')).toBeInTheDocument();
        expect(
            page.getByRole('button', { name: 'Connexion' }),
        ).toBeInTheDocument();
    });

    it('does not offer registration or password reset', () => {
        const page = renderVisible();

        expect(page.queryByText(/inscri/i)).not.toBeInTheDocument();
        expect(
            page.queryByText(/mot de passe oublié/i),
        ).not.toBeInTheDocument();
    });

    it('shows the status message when provided', () => {
        const page = renderVisible({ status: 'Session expired' });

        expect(page.getByText('Session expired')).toBeInTheDocument();
    });

    it('offers passkey login', () => {
        const page = renderVisible();

        expect(page.getByTestId('passkey-verify')).toBeInTheDocument();
    });
});

describe('Login page layout', () => {
    it('shows the illustration on the right column', () => {
        const { container } = render(<Login />);
        const image = container.querySelector('img[src="/images/login.jpg"]');
        const frame = image?.parentElement;

        expect(image).toBeInTheDocument();
        expect(frame).toHaveClass('rounded-3xl', 'size-full');
        expect(frame?.querySelector('canvas')).toBeInTheDocument();
        expect(frame?.parentElement).toHaveClass('lg:h-svh', 'lg:sticky');
    });
});

describe('Login page logo', () => {
    it('shows the small rounded logo', () => {
        render(<Login />);
        const logo = screen.getByAltText('Dashboard');

        expect(logo).toHaveAttribute('src', '/images/logo.jpg');
        expect(logo).toHaveClass('size-10', 'rounded-md');
    });
});
