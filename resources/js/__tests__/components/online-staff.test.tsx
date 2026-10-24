import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { useOnlineStaff } = vi.hoisted(() => ({ useOnlineStaff: vi.fn() }));

vi.mock('@/hooks/use-online-staff', () => ({ useOnlineStaff }));

import { OnlineStaff } from '@/components/online-staff';
import { TooltipProvider } from '@/components/ui/tooltip';

function renderOnline() {
    return render(
        <TooltipProvider>
            <OnlineStaff />
        </TooltipProvider>,
    );
}

describe('OnlineStaff', () => {
    it('renders nothing when nobody is online', () => {
        useOnlineStaff.mockReturnValue([]);

        const { container } = renderOnline();

        expect(container).toBeEmptyDOMElement();
    });

    it('renders one avatar with initials per online member', () => {
        useOnlineStaff.mockReturnValue([
            { id: 1, name: 'Admin' },
            { id: 2, name: 'Admin Deux' },
        ]);

        renderOnline();

        expect(
            screen.getByLabelText('2 membre(s) en ligne'),
        ).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('AD')).toBeInTheDocument();
    });

    it('marks each online member with a green dot instead of a label', () => {
        useOnlineStaff.mockReturnValue([
            { id: 1, name: 'Admin' },
            { id: 2, name: 'Admin Deux' },
        ]);

        renderOnline();

        expect(screen.getAllByTestId('online-dot')).toHaveLength(2);
        expect(screen.queryByText('En ligne')).toBeNull();
    });
});

describe('OnlineStaff tooltip', () => {
    it('lists every online member in one tooltip on hover', async () => {
        const user = userEvent.setup();
        useOnlineStaff.mockReturnValue([
            { id: 1, name: 'Admin' },
            { id: 2, name: 'Admin Deux' },
        ]);

        renderOnline();
        await user.hover(screen.getByLabelText('2 membre(s) en ligne'));

        const list = await screen.findByRole('list', {
            name: 'Membres en ligne',
        });
        expect(list).toHaveTextContent('Admin');
        expect(list).toHaveTextContent('Admin Deux');
    });
});
