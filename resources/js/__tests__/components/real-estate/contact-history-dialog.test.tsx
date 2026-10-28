import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
    ContactHistoryDialog,
    notedLater,
} from '@/components/real-estate/contact-history-dialog';
import { makeContactHistoryEntry } from '@/test/fixtures/real-estate';

describe('ContactHistoryDialog', () => {
    it('shows nothing without any exchange: there is no history to open', () => {
        render(<ContactHistoryDialog contacts={[]} name="Marthe Dupuy" />);

        expect(
            screen.queryByRole('button', { name: "Voir l'historique" }),
        ).toBeNull();
    });

    it('opens a modal listing every exchange, most recent first, with who noted it and when it was dated after the fact', async () => {
        const user = userEvent.setup();
        render(
            <ContactHistoryDialog
                name="Marthe Dupuy"
                contacts={[
                    makeContactHistoryEntry({
                        id: 2,
                        at: '2026-10-28T16:03:00Z',
                        noted_at: '2026-10-28T16:03:00Z',
                        by: { id: 1, name: 'Admin', avatar: null },
                    }),
                    makeContactHistoryEntry({
                        id: 1,
                        at: '2026-09-01T08:00:00Z',
                        noted_at: '2026-10-28T13:44:00Z',
                        by: { id: 2, name: 'Admin Deux', avatar: null },
                    }),
                ]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: "Voir l'historique" }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Historique des échanges',
        });
        expect(dialog).toHaveTextContent('2 échanges notés avec Marthe Dupuy');
        const rows = within(
            screen.getByRole('list', { name: 'Échanges notés' }),
        ).getAllByRole('listitem');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('mercredi 28 octobre 2026');
        expect(rows[0]).toHaveTextContent('17:03');
        expect(rows[0]).toHaveTextContent('Noté par Admin');
        expect(rows[0]).not.toHaveTextContent('le 28 oct.');
        // Daté après coup : la ligne dit quand il a été saisi.
        expect(rows[1]).toHaveTextContent('mardi 1 septembre 2026');
        expect(rows[1]).toHaveTextContent(
            'Noté par Admin Deux le 28 oct. 2026',
        );
    });

    it('tells an exchange dated after the fact from one noted the same day', () => {
        expect(
            notedLater(
                makeContactHistoryEntry({
                    at: '2026-09-01T08:00:00Z',
                    noted_at: '2026-09-01T18:00:00Z',
                }),
            ),
        ).toBe(false);
        expect(
            notedLater(
                makeContactHistoryEntry({
                    at: '2026-09-01T08:00:00Z',
                    noted_at: '2026-09-02T08:00:00Z',
                }),
            ),
        ).toBe(true);
    });
});
