import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker, parseTypedDate } from '@/components/date-picker';

describe('parseTypedDate', () => {
    it('accepts French long dates, slashes and ISO', () => {
        expect(parseTypedDate('4 septembre 2026')?.getMonth()).toBe(8);
        expect(parseTypedDate('04/09/2026')?.getDate()).toBe(4);
        expect(parseTypedDate('2026-09-04')?.getFullYear()).toBe(2026);
        expect(parseTypedDate('n importe quoi')).toBeUndefined();
        expect(parseTypedDate('')).toBeUndefined();
    });
});

describe('DatePicker', () => {
    it('shows the ISO value formatted in French in the input', () => {
        render(
            <DatePicker
                value="2026-09-04"
                onChange={vi.fn()}
                aria-label="Date"
            />,
        );

        expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue(
            '4 septembre 2026',
        );
    });

    it('emits an ISO date when a valid date is typed', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<DatePicker value="" onChange={onChange} aria-label="Date" />);

        await user.type(
            screen.getByRole('textbox', { name: 'Date' }),
            '15/09/2026',
        );

        expect(onChange).toHaveBeenLastCalledWith('2026-09-15');
    });

    it('opens the calendar from the button and emits the picked day', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <DatePicker
                value="2026-09-04"
                onChange={onChange}
                aria-label="Date"
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Ouvrir le calendrier' }),
        );
        await user.click(
            await screen.findByRole('button', { name: /15 septembre 2026/ }),
        );

        expect(onChange).toHaveBeenCalledWith('2026-09-15');
    });

    it('lets the user type a date digit by digit without clobbering the input', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        function Harness() {
            const [value, setValue] = useState('');

            return (
                <DatePicker
                    id="d"
                    value={value}
                    onChange={(iso) => {
                        onChange(iso);
                        setValue(iso);
                    }}
                />
            );
        }

        render(<Harness />);

        const input = document.getElementById('d') as HTMLInputElement;
        await user.type(input, '12/10/2026');

        expect(input).toHaveValue('12/10/2026');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenLastCalledWith('2026-10-12');
        expect(parseTypedDate('12/10/2')).toBeUndefined();

        await user.tab();
        expect(input).toHaveValue('12 octobre 2026');
    });
});
