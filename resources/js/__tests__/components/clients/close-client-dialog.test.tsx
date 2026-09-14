import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { CloseClientDialog } from '@/components/clients/close-client-dialog';
import { clientClosingReasons } from '@/test/fixtures/client';

describe('CloseClientDialog', () => {
    it('asks for a reason, then closes the dossier with it', async () => {
        const user = userEvent.setup();
        render(
            <CloseClientDialog
                clientUuid="c-1"
                clientName="Léa Durand"
                reasons={[...clientClosingReasons]}
                open
                onOpenChange={() => undefined}
            />,
        );

        expect(
            screen.getByRole('dialog', {
                name: 'Clôturer le dossier Léa Durand ?',
            }),
        ).toBeInTheDocument();
        const confirm = screen.getByRole('button', {
            name: 'Clôturer le dossier',
        });
        // Sans motif, rien ne part.
        expect(confirm).toBeDisabled();

        await user.click(
            screen.getByRole('radio', { name: 'Client installé' }),
        );
        await user.type(
            screen.getByLabelText('Précision (facultatif)'),
            'Bail signé.',
        );
        await user.click(confirm);

        expect(post).toHaveBeenCalledWith(
            '/clients/c-1/close',
            { reason: 'installed', note: 'Bail signé.' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
