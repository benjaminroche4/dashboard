import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
    LeadNoteComposer,
    matchMentions,
    mentionQuery,
} from '@/components/leads/lead-note-composer';

const staff = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Admin 2' },
    { id: 3, name: 'Camille' },
];

describe('mentionQuery / matchMentions', () => {
    it('finds the @ word under the caret and matches staff by prefix', () => {
        expect(mentionQuery('Vu avec @Cam', 12)).toEqual({
            start: 8,
            query: 'Cam',
        });
        expect(mentionQuery('mail@example.com', 16)).toBeNull();
        expect(
            matchMentions('adm', staff).map((member) => member.name),
        ).toEqual(['Admin', 'Admin 2']);
    });
});

describe('LeadNoteComposer', () => {
    it('suggests staff after @ and inserts the chosen name', async () => {
        const user = userEvent.setup();
        let value = '';
        const onChange = vi.fn((next: string) => {
            value = next;
        });
        const view = render(
            <LeadNoteComposer
                value={value}
                onChange={onChange}
                onSubmit={vi.fn()}
                candidates={staff}
            />,
        );
        const box = screen.getByRole('textbox', { name: 'Nouvelle note' });

        await user.type(box, 'Vu avec @Ca');
        view.rerender(
            <LeadNoteComposer
                value="Vu avec @Ca"
                onChange={onChange}
                onSubmit={vi.fn()}
                candidates={staff}
            />,
        );
        await user.type(box, '{ArrowDown}');
        expect(
            screen.getByRole('option', { name: '@Camille' }),
        ).toHaveAttribute('aria-selected', 'true');

        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenLastCalledWith('Vu avec @Camille ');
    });

    it('submits with ⌘+Entrée when there is text', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        render(
            <LeadNoteComposer
                value="Très motivé."
                onChange={vi.fn()}
                onSubmit={onSubmit}
                candidates={staff}
            />,
        );

        await user.click(
            screen.getByRole('textbox', { name: 'Nouvelle note' }),
        );
        await user.keyboard('{Control>}{Enter}{/Control}');

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});
