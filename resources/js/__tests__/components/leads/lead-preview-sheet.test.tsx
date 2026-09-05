import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { post, patch } = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { patch, on: () => () => undefined },
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

import { LeadPreviewSheet } from '@/components/leads/lead-preview-sheet';
import { leadStatuses, makeLeadDetail } from '@/test/fixtures/lead';

describe('LeadPreviewSheet', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('loads the preview, shows contact, notes and history, and links to the full page', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({
                    lead: makeLeadDetail({
                        assignee: { id: 1, name: 'Admin' },
                    }),
                    notes: [
                        {
                            id: 1,
                            body: 'Rappeler mardi.',
                            by: 'Admin',
                            at: '2026-09-04T10:00:00+00:00',
                        },
                    ],
                    history: [
                        {
                            id: 1,
                            from: null,
                            to: 'À traiter',
                            to_status: 'todo',
                            by: 'Admin',
                            at: '2026-09-01T09:00:00+00:00',
                        },
                    ],
                }),
            })),
        );
        const user = userEvent.setup();
        render(
            <LeadPreviewSheet
                leadId={1}
                statuses={leadStatuses}
                onOpenChange={() => undefined}
            />,
        );

        expect(
            await screen.findByRole('heading', { name: 'Léa Durand' }),
        ).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith(
            '/leads/1/preview',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
        expect(
            screen.getByRole('link', { name: 'lea@example.com' }),
        ).toHaveAttribute('href', 'mailto:lea@example.com');
        expect(screen.getByText('Rappeler mardi.')).toBeInTheDocument();
        expect(
            screen.getByText('À traiter', { selector: 'span.font-medium' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Fiche complète' }),
        ).toHaveAttribute('href', '/leads/1');
        expect(
            screen.getByRole('button', { name: 'Suivi par Admin, changer' }),
        ).toBeInTheDocument();

        await user.type(screen.getByLabelText('Nouvelle note'), 'Très motivé.');
        await user.click(screen.getByRole('button', { name: 'Ajouter' }));

        expect(post).toHaveBeenCalledWith(
            '/leads/1/notes',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('stays closed without a lead', () => {
        render(
            <LeadPreviewSheet
                leadId={null}
                statuses={leadStatuses}
                onOpenChange={() => undefined}
            />,
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
