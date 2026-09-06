import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConditionChoices } from '@/components/leads/condition-choices';

const props = {
    durations: [
        { value: 'short' as const, label: 'Court terme · 1 à 3 mois' },
        { value: 'long' as const, label: 'Long terme · 12 mois et plus' },
    ],
    guarantors: [
        { value: 'garantme' as const, label: 'Garantme' },
        { value: 'bancaire' as const, label: 'Garantie bancaire' },
    ],
    furnishedOptions: [
        { value: 'furnished' as const, label: 'Meublé' },
        { value: 'either' as const, label: 'Indifférent' },
    ],
    errors: {},
};

describe('ConditionChoices', () => {
    it('renders compact pills with the full label as accessible name', () => {
        render(
            <ConditionChoices
                {...props}
                values={{ duration: 'short', guarantors: [], furnished: '' }}
                onChange={vi.fn()}
            />,
        );

        const short = screen.getByRole('radio', {
            name: 'Court terme · 1 à 3 mois',
        });

        expect(short).toHaveAttribute('aria-checked', 'true');
        expect(short).toHaveClass('h-8', 'rounded-md', 'text-xs');
        expect(
            screen.getByRole('radio', { name: 'Indifférent' }),
        ).toHaveAttribute('aria-checked', 'false');
    });

    it('accepts several guarantors and one duration at most', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(
            <ConditionChoices
                {...props}
                values={{
                    duration: 'short',
                    guarantors: ['garantme'],
                    furnished: '',
                }}
                onChange={onChange}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Garantie bancaire' }),
        );
        expect(onChange).toHaveBeenLastCalledWith('guarantors', [
            'garantme',
            'bancaire',
        ]);

        await user.click(
            screen.getByRole('radio', { name: 'Court terme · 1 à 3 mois' }),
        );
        expect(onChange).toHaveBeenLastCalledWith('duration', '');
    });

    it('shows a field error under its pills', () => {
        render(
            <ConditionChoices
                {...props}
                values={{ duration: '', guarantors: [], furnished: '' }}
                onChange={vi.fn()}
                errors={{ furnished: 'Valeur inconnue.' }}
            />,
        );

        expect(screen.getByText('Valeur inconnue.')).toBeInTheDocument();
    });
});
