import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

import { ActivityFeed } from '@/components/activity/activity-feed';
import { makeActivity } from '@/test/fixtures/activity';

const activities = Array.from({ length: 8 }, (_, index) =>
    makeActivity({ id: index + 1, message: `a fait l’action ${index + 1}` }),
);

describe('ActivityFeed', () => {
    it('shows everything when no limit is given', () => {
        render(
            <ActivityFeed
                groups={[{ label: 'Dernières actions', items: activities }]}
            />,
        );

        expect(
            within(
                screen.getByRole('region', { name: 'Dernières actions' }),
            ).getAllByRole('listitem'),
        ).toHaveLength(8);
        expect(
            screen.queryByRole('button', { name: /Voir les/ }),
        ).not.toBeInTheDocument();
    });

    it('stacks the extra entries behind a button, and unfolds them', async () => {
        const user = userEvent.setup();
        render(
            <ActivityFeed
                groups={[{ label: 'Dernières actions', items: activities }]}
                collapseAfter={5}
            />,
        );

        const feed = within(
            screen.getByRole('region', { name: 'Dernières actions' }),
        );
        // Cinq entrées visibles, plus la ligne du bouton.
        expect(feed.getAllByRole('listitem')).toHaveLength(6);
        expect(feed.getByText('8')).toBeInTheDocument();

        const more = screen.getByRole('button', { name: 'Voir les 3 autres' });
        expect(more).toHaveAttribute('aria-expanded', 'false');

        await user.click(more);
        expect(feed.getAllByRole('listitem')).toHaveLength(9);
        await user.click(screen.getByRole('button', { name: 'Réduire' }));
        expect(feed.getAllByRole('listitem')).toHaveLength(6);
    });
});
