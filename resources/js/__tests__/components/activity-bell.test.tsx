import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { makeActivity } from '@/test/fixtures/activity';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('ActivityBell', () => {
    beforeEach(() => {
        clearMissedEvents();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('counts the actions that passed in silence and opens the latest ones', async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValue(
            jsonResponse([
                makeActivity({
                    id: 1,
                    message: 'a créé le lead Léa Durand',
                    actor: { id: 2, name: 'Chloé Martin', avatar: null },
                }),
            ]),
        );
        render(<ActivityBell />);

        expect(
            screen.getByRole('button', {
                name: 'Dernières actions de l’équipe',
            }),
        ).toBeInTheDocument();

        act(() => {
            recordMissedEvent();
            recordMissedEvent();
        });
        // Une pastille rouge sans chiffre : le nombre reste dans le libellé.
        const bell = screen.getByRole('button', {
            name: '2 actions de l’équipe depuis votre dernière consultation',
        });
        expect(bell).not.toHaveTextContent('2');
        expect(bell.querySelector('[data-missed="2"]')).toHaveClass(
            'bg-red-500',
        );
        // Ce qu'on n'a pas vu survit au rechargement de l'onglet.
        expect(sessionStorage.getItem('dashboard.missed-events')).toBe('2');

        // Ouvrir consulte : le compteur repart de zéro et les actions arrivent.
        await user.click(screen.getByRole('button'));
        expect(
            screen.getByRole('button', {
                name: 'Dernières actions de l’équipe',
            }),
        ).toBeInTheDocument();
        expect(sessionStorage.getItem('dashboard.missed-events')).toBeNull();
        expect(fetchMock).toHaveBeenCalledWith(
            '/tools/activity/recent',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        const list = await screen.findByRole('list', {
            name: 'Dernières actions',
        });
        expect(list).toHaveTextContent(
            'Chloé Martin a créé le lead Léa Durand',
        );
        expect(
            screen.getByRole('link', { name: 'Tout le journal' }),
        ).toHaveAttribute('href', '/tools/activity');
    });

    it('explains a journal closed to the member', async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValue(
            jsonResponse({ message: 'Forbidden' }, 403),
        );
        render(<ActivityBell />);

        await user.click(screen.getByRole('button'));

        await waitFor(() =>
            expect(
                screen.getByText(
                    'Le journal d’activité n’est pas ouvert à votre compte.',
                ),
            ).toBeInTheDocument(),
        );
    });
});
