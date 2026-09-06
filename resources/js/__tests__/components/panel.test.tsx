import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from '@/components/panel';

describe('Panel', () => {
    it('renders the title, description, action and content in the app frame', () => {
        render(
            <Panel
                title="Contact"
                description="Coordonnées du lead"
                action={<button type="button">Modifier</button>}
            >
                <p>Contenu</p>
            </Panel>,
        );

        const panel = screen.getByRole('region', { name: 'Contact' });

        expect(panel).toHaveClass('bg-sidebar', 'rounded-xl', 'border');
        expect(
            screen.getByRole('heading', { level: 2, name: 'Contact' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Coordonnées du lead')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Modifier' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Contenu')).toBeInTheDocument();
    });

    it('uses a red frame for the destructive tone', () => {
        render(
            <Panel title="Supprimer" tone="destructive">
                <p>Danger</p>
            </Panel>,
        );

        expect(screen.getByRole('region', { name: 'Supprimer' })).toHaveClass(
            'border-red-200',
        );
        expect(screen.getByRole('heading', { level: 2 })).toHaveClass(
            'text-red-700',
        );
    });
});
