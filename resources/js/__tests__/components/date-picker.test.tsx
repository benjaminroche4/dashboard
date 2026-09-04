import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from '@/components/date-picker';

describe('DatePicker', () => {
    it('shows the ISO value formatted in French', () => {
        render(
            <DatePicker
                value="2026-09-04"
                onChange={vi.fn()}
                aria-label="Date"
            />,
        );

        expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent(
            '4 septembre 2026',
        );
    });

    it('shows the placeholder when empty and opens a calendar', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <DatePicker
                value=""
                onChange={onChange}
                aria-label="Date"
                placeholder="Choisir"
            />,
        );

        const trigger = screen.getByRole('button', { name: 'Date' });
        expect(trigger).toHaveTextContent('Choisir');

        await user.click(trigger);
        expect(await screen.findByRole('grid')).toBeInTheDocument();
    });

    it('emits an ISO date when a day is picked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <DatePicker
                value="2026-09-04"
                onChange={onChange}
                aria-label="Date"
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Date' }));
        await user.click(
            await screen.findByRole('button', { name: /15 septembre 2026/ }),
        );

        expect(onChange).toHaveBeenCalledWith('2026-09-15');
    });
});
