import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { patch },
    usePage: () => ({
        props: { staff: [{ id: 1, name: 'Admin', role: 'admin' }] },
    }),
    useForm: (initial: { body: string }) => {
        const [data, setData] = useState(initial);

        return {
            data,
            errors: {},
            processing: false,
            setData: (key: 'body', value: string) => setData({ [key]: value }),
            reset: () => setData(initial),
            post,
        };
    },
}));

import LeadsShow from '@/pages/leads/show';
import { leadStatuses, makeLeadDetail } from '@/test/fixtures/lead';

describe('Lead detail page', () => {
    it('shows contact links, project facts, message, notes and history', () => {
        render(
            <LeadsShow
                lead={makeLeadDetail()}
                notes={[
                    {
                        id: 1,
                        body: 'Rappeler mardi.',
                        by: 'Admin',
                        at: '2026-09-04T10:00:00+00:00',
                    },
                ]}
                history={[
                    {
                        id: 1,
                        from: null,
                        to: 'À traiter',
                        to_status: 'todo',
                        by: 'Admin',
                        at: '2026-09-01T09:00:00+00:00',
                    },
                    {
                        id: 2,
                        from: 'À traiter',
                        to: 'En cours',
                        to_status: 'in_progress',
                        by: null,
                        at: '2026-09-02T09:00:00+00:00',
                    },
                ]}
                statuses={leadStatuses}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Léa Durand',
        );
        expect(
            screen.getByRole('link', { name: 'lea@example.com' }),
        ).toHaveAttribute('href', 'mailto:lea@example.com');
        expect(
            screen.getByRole('link', { name: '+33 6 00 00 00 00' }),
        ).toHaveAttribute('href', 'tel:+33600000000');
        expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
            'href',
            '/leads/1/edit',
        );
        expect(screen.getAllByText(/2.500,00.*\/ mois/).length).toBeGreaterThan(
            0,
        );
        expect(
            screen.getByText('Arrive avec sa famille, cherche un 3 pièces.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Rappeler mardi.')).toBeInTheDocument();
        expect(screen.getByLabelText('Qualité 4 sur 5')).toBeInTheDocument();
        const history = within(
            screen
                .getByRole('heading', { name: 'Historique' })
                .closest('section') as HTMLElement,
        );
        expect(history.getAllByRole('listitem')).toHaveLength(2);
        expect(history.getByText('(depuis À traiter)')).toBeInTheDocument();
    });

    it('posts a new note', async () => {
        const user = userEvent.setup();
        render(
            <LeadsShow
                lead={makeLeadDetail()}
                notes={[]}
                history={[]}
                statuses={leadStatuses}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Ajouter la note' }),
        ).toBeDisabled();
        await user.type(screen.getByLabelText('Nouvelle note'), 'Très motivé.');
        await user.click(
            screen.getByRole('button', { name: 'Ajouter la note' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/leads/1/notes',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
