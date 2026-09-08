import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post },
    usePage: () => ({
        props: { errors: { code: 'Ce code n’est pas le bon.' } },
    }),
}));

import PublicDocumentCode from '@/pages/public/document-code';

describe('Public document code page', () => {
    it('asks for the six-digit pairing code, shows the server error and posts the code', async () => {
        const user = userEvent.setup();
        render(
            <PublicDocumentCode
                request={{ name: 'Léa Martin', language: 'fr' }}
                verifyUrl="/depot/tok-abc/code"
                company={{
                    name: 'Relocation In Paris',
                    email: 'contact@example.com',
                    phone: '+33 1 00 00 00 00',
                }}
                labels={{
                    title: 'Vos pièces justificatives',
                    intro: 'Saisissez le code d’appairage à 6 chiffres.',
                    code: 'Code d’appairage',
                    submit: 'Ouvrir mon espace',
                    contact: 'Une question ? Écrivez-nous :',
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Vos pièces justificatives' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Ce code n’est pas le bon.'),
        ).toBeInTheDocument();
        const submit = screen.getByRole('button', {
            name: 'Ouvrir mon espace',
        });
        expect(submit).toBeDisabled();

        await user.type(
            screen.getByLabelText('Code d’appairage', { selector: 'input' }),
            '482913',
        );

        expect(post).toHaveBeenCalledWith(
            '/depot/tok-abc/code',
            { code: '482913' },
            expect.anything(),
        );
    });
});
