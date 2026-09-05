import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { patch },
    usePage: () => ({
        props: {
            staff: [
                { id: 1, name: 'Admin', role: 'admin' },
                { id: 2, name: 'Camille Roy', role: 'member' },
            ],
        },
    }),
}));

import { LeadAssignMenu } from '@/components/leads/lead-assign-menu';
import { makeLead } from '@/test/fixtures/lead';

describe('LeadAssignMenu', () => {
    it('lists the staff with avatars and roles, marks the current one and assigns another', async () => {
        const user = userEvent.setup();
        render(
            <LeadAssignMenu
                lead={makeLead({ assignee: { id: 1, name: 'Admin' } })}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Suivi par Admin, changer' }),
        );

        const current = await screen.findByRole('menuitem', { name: /Admin/ });
        expect(current).toHaveAttribute('aria-current', 'true');
        expect(
            screen.getByRole('menuitem', { name: /Camille Roy/ }),
        ).not.toHaveAttribute('aria-current');

        await user.click(screen.getByRole('menuitem', { name: /Camille Roy/ }));

        expect(patch).toHaveBeenCalledWith(
            '/leads/1/assign',
            { user_id: 2 },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('releases the lead with « Personne »', async () => {
        const user = userEvent.setup();
        patch.mockClear();
        render(
            <LeadAssignMenu
                lead={makeLead({ assignee: { id: 1, name: 'Admin' } })}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Suivi par Admin, changer' }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: /Personne/ }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/leads/1/assign',
            { user_id: null },
            expect.anything(),
        );
    });
});
