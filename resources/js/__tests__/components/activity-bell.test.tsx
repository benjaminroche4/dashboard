import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import { ActivityBell } from '@/components/activity-bell';
import { clearMissedEvents, recordMissedEvent } from '@/lib/missed-events';

describe('ActivityBell', () => {
    beforeEach(() => clearMissedEvents());

    it('counts the actions that passed in silence and leads to the journal', async () => {
        const user = userEvent.setup();
        render(<ActivityBell />);

        expect(
            screen.getByRole('link', { name: 'Journal d’activité' }),
        ).toHaveAttribute('href', '/tools/activity');

        act(() => {
            recordMissedEvent();
            recordMissedEvent();
        });
        expect(
            screen.getByRole('link', {
                name: '2 actions de l’équipe depuis votre dernière consultation',
            }),
        ).toHaveTextContent('2');

        // Un clic consulte : le compteur repart de zéro.
        await user.click(screen.getByRole('link'));
        expect(
            screen.getByRole('link', { name: 'Journal d’activité' }),
        ).toBeInTheDocument();
    });
});
