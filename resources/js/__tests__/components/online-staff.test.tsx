import { render, screen } from '@testing-library/react';
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
});
