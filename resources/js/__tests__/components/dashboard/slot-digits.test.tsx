import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlotDigits } from '@/components/dashboard/slot-digits';

describe('SlotDigits', () => {
    it('renders the time digit by digit and only rolls the digits, not the colon', () => {
        render(
            <p aria-label="Heure à Paris">
                <SlotDigits value="17:48" />
            </p>,
        );

        const clock = screen.getByLabelText('Heure à Paris');
        expect(clock).toHaveTextContent('17:48');
        const rolling = clock.querySelectorAll('.animate-slot-in');
        expect(rolling).toHaveLength(4);
        expect([...rolling].map((digit) => digit.textContent).join('')).toBe(
            '1748',
        );
    });

    it('remounts only the digit that changed, so the others stay still', () => {
        const { rerender } = render(<SlotDigits value="17:48" />);
        const before = [...document.querySelectorAll('.animate-slot-in')];

        rerender(<SlotDigits value="17:49" />);
        const after = [...document.querySelectorAll('.animate-slot-in')];

        // Les trois premiers chiffres sont les mêmes nœuds ; le dernier a été remonté.
        expect(after[0]).toBe(before[0]);
        expect(after[1]).toBe(before[1]);
        expect(after[2]).toBe(before[2]);
        expect(after[3]).not.toBe(before[3]);
        expect(after[3]).toHaveTextContent('9');
    });
});
