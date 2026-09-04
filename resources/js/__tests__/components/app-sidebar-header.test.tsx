import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/breadcrumbs', () => ({
    Breadcrumbs: () => <nav aria-label="fil d'ariane" />,
}));
vi.mock('@/components/online-staff', () => ({ OnlineStaff: () => null }));
vi.mock('@/components/realtime-staff', () => ({ RealtimeStaff: () => null }));
vi.mock('@/components/ui/sidebar', () => ({
    SidebarTrigger: () => <button type="button">toggle</button>,
}));
vi.mock('@inertiajs/react', () => ({ router: { visit: vi.fn() } }));

import { AppSidebarHeader } from '@/components/app-sidebar-header';

describe('AppSidebarHeader', () => {
    it('lays out navigation, search and notifications in three zones', () => {
        const { container } = render(<AppSidebarHeader />);
        const header = container.querySelector('header');

        expect(header).toHaveClass('grid-cols-[1fr_auto_1fr]');
        expect(screen.getByLabelText("fil d'ariane")).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'toggle' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Rechercher' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Notifications' }),
        ).toBeInTheDocument();
    });
});
