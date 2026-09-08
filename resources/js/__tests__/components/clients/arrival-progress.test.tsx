import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArrivalProgress } from '@/components/clients/arrival-progress';

describe('ArrivalProgress', () => {
    it('shows the arrival date, the countdown and a progress bar', () => {
        render(
            <ArrivalProgress
                convertedAt="2026-08-09T12:00:00"
                arrivalAt="2026-10-08"
                now={new Date('2026-09-08T12:00:00')}
            />,
        );

        const bar = screen.getByRole('progressbar', {
            name: 'Avancement vers l’arrivée',
        });
        expect(bar).toHaveAttribute('aria-valuenow', '50');
        expect(bar).toHaveAttribute('aria-valuetext', 'J-30');
        expect(screen.getByText('08 oct. 2026')).toBeInTheDocument();
        expect(screen.getByText('J-30')).toBeInTheDocument();
        expect(bar.parentElement).toHaveAttribute('data-state', 'upcoming');
        expect(bar.parentElement).toHaveAttribute('data-tone', 'amber');
        expect(bar.firstElementChild).toHaveClass('bg-amber-500');
    });

    it('is green far from the arrival and red the week before', () => {
        const { rerender } = render(
            <ArrivalProgress
                convertedAt="2026-09-01T00:00:00"
                arrivalAt="2027-03-01"
                now={new Date('2026-09-08T12:00:00')}
            />,
        );
        expect(screen.getByRole('progressbar').parentElement).toHaveAttribute(
            'data-tone',
            'green',
        );

        rerender(
            <ArrivalProgress
                convertedAt="2026-09-01T00:00:00"
                arrivalAt="2026-09-12"
                now={new Date('2026-09-08T12:00:00')}
            />,
        );
        expect(screen.getByRole('progressbar').parentElement).toHaveAttribute(
            'data-tone',
            'red',
        );
        expect(screen.getByRole('progressbar').firstElementChild).toHaveClass(
            'bg-red-500',
        );
    });

    it('stays neutral without an arrival date', () => {
        render(<ArrivalProgress convertedAt={null} arrivalAt={null} />);

        expect(screen.getByText('Arrivée non renseignée')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '0',
        );
    });
});
