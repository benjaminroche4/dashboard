import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CreateButton } from '@/components/create-button';

const start = vi.fn();
const stop = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('lucide-animated', async () => {
    const React = await import('react');

    return {
        PlusIcon: React.forwardRef<
            { startAnimation: () => void; stopAnimation: () => void },
            { className?: string }
        >(function PlusIcon({ className }, ref) {
            React.useImperativeHandle(ref, () => ({
                startAnimation: start,
                stopAnimation: stop,
            }));

            return <span data-testid="plus-icon" className={className} />;
        }),
    };
});

describe('CreateButton', () => {
    it('renders a round link named by its label, with the animated plus', () => {
        render(
            <CreateButton
                href={{ url: '/locataires/create', method: 'get' }}
                label="Nouveau lead"
            />,
        );

        const link = screen.getByRole('link', { name: 'Nouveau lead' });
        expect(link).toHaveAttribute('href', '/locataires/create');
        expect(link).toHaveAttribute('title', 'Nouveau lead');
        expect(link).toHaveClass('rounded-full');
        expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('animates the plus while the whole button is hovered', () => {
        render(
            <CreateButton
                href={{ url: '/owners', method: 'get' }}
                label="Prospecter un propriétaire"
            />,
        );

        const link = screen.getByRole('link', {
            name: 'Prospecter un propriétaire',
        });
        fireEvent.mouseEnter(link);
        expect(start).toHaveBeenCalled();
        fireEvent.mouseLeave(link);
        expect(stop).toHaveBeenCalled();
    });
});
