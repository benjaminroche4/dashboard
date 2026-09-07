import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { LeadConvertDialog } from '@/components/leads/lead-convert-dialog';

describe('LeadConvertDialog', () => {
    it('asks for confirmation then posts to the convert route', async () => {
        const user = userEvent.setup();
        render(
            <LeadConvertDialog
                leadUuid="abc"
                leadName="Léa Durand"
                status="in_progress"
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Convertir en client' }),
        );
        expect(post).not.toHaveBeenCalled();
        expect(
            screen.getByRole('dialog', {
                name: 'Convertir Léa Durand en client ?',
            }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Confirmer' }));

        expect(post).toHaveBeenCalledWith(
            '/leads/abc/convert',
            {},
            expect.any(Object),
        );
    });

    it('shows the server error and disappears for converted or archived leads', () => {
        post.mockImplementation(
            (
                _url: string,
                _data: object,
                options: { onError?: (e: Record<string, string>) => void },
            ) => options.onError?.({ status: 'Ce lead est déjà client.' }),
        );
        const { unmount } = render(
            <LeadConvertDialog leadUuid="abc" leadName="Léa" status="todo" />,
        );
        unmount();

        render(
            <LeadConvertDialog
                leadUuid="abc"
                leadName="Léa"
                status="converted"
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Convertir en client' }),
        ).toBeNull();
    });
});
