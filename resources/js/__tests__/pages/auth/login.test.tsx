import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/passkey-verify', () => ({
    default: () => <div data-testid="passkey-verify" />,
}));

// Erreurs injectées dans le <Form> mocké, modifiables par test.
const formState = vi.hoisted(() => ({ errors: {} as Record<string, string> }));

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
            {children({ processing: false, errors: formState.errors })}
        </form>
    ),
}));

import Login from '@/pages/auth/login';

function renderVisible(props: { status?: string } = {}) {
    render(<Login {...props} />);

    return screen;
}

describe('Login page', () => {
    beforeEach(() => {
        formState.errors = {};
    });

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

    it('shows the status message in a status banner', () => {
        const page = renderVisible({ status: 'Vous avez été déconnecté.' });

        expect(page.getByRole('status')).toHaveTextContent(
            'Vous avez été déconnecté.',
        );
    });

    it('shows authentication errors in a global banner and flags the field', () => {
        formState.errors = { email: 'Ces identifiants ne correspondent pas.' };
        const page = renderVisible();

        expect(page.getByRole('alert')).toHaveTextContent(
            'Connexion impossible',
        );
        expect(page.getByRole('alert')).toHaveTextContent(
            'Ces identifiants ne correspondent pas.',
        );
        expect(page.getByLabelText('Adresse e-mail')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('puts the passkey button after the form and shows the privacy note', () => {
        const page = renderVisible();
        const form = page
            .getByRole('button', { name: 'Connexion' })
            .closest('form');
        const passkey = page.getByTestId('passkey-verify');

        expect(form).not.toBeNull();
        expect(
            form!.compareDocumentPosition(passkey) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(page.getByText(/Accès réservé au staff/)).toBeInTheDocument();
    });

    it('uses no positive tabIndex so the tab order follows the DOM', () => {
        const { container } = render(<Login />);

        expect(
            container.querySelectorAll(
                '[tabindex]:not([tabindex="-1"]):not([tabindex="0"])',
            ),
        ).toHaveLength(0);
    });

    it('greets the staff with a personalised title', () => {
        const page = renderVisible();

        expect(page.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Bon retour',
        );
        expect(page.getByText(/Espace staff Dashboard/)).toBeInTheDocument();
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
        expect(image).toHaveClass(
            'object-cover',
            'grayscale',
            'mix-blend-luminosity',
        );
        expect(frame).toHaveClass(
            'rounded-3xl',
            'bg-[#731a2f]',
            'dark:bg-[#3b0d18]',
        );
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
