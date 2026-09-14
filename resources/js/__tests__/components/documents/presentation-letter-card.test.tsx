import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { patch },
    usePage: () => ({ props: { features: { assistant: true } } }),
}));
vi.mock('@/lib/toast', () => ({ notify: { error: vi.fn() } }));

import { PresentationLetterCard } from '@/components/documents/presentation-letter-card';

const requestUuid = '0199b0c0-0000-7000-8000-000000000001';

describe('PresentationLetterCard', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('lets the assistant propose, the team edit, then saves what was reviewed', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ letter: 'Nous présentons le dossier…' }),
            }),
        );

        render(
            <PresentationLetterCard requestUuid={requestUuid} letter={null} />,
        );

        // Rien à enregistrer tant que le texte n'a pas changé.
        expect(
            screen.getByRole('button', { name: 'Enregistrer' }),
        ).toBeDisabled();

        await user.click(
            screen.getByRole('button', { name: 'Rédiger avec l’IA' }),
        );
        await waitFor(() =>
            expect(screen.getByLabelText('Lettre de présentation')).toHaveValue(
                'Nous présentons le dossier…',
            ),
        );

        await user.type(
            screen.getByLabelText('Lettre de présentation'),
            ' Relu.',
        );
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(patch).toHaveBeenCalledWith(
            `/tools/documents/${requestUuid}/letter`,
            { letter: 'Nous présentons le dossier… Relu.' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('sends null to remove the letter from the dossier', async () => {
        const user = userEvent.setup();
        render(
            <PresentationLetterCard
                requestUuid={requestUuid}
                letter="Ancienne lettre."
            />,
        );

        await user.clear(screen.getByLabelText('Lettre de présentation'));
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(patch).toHaveBeenCalledWith(
            `/tools/documents/${requestUuid}/letter`,
            { letter: null },
            expect.anything(),
        );
    });
});
