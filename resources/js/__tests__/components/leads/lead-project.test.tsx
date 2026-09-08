import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LeadProject } from '@/components/leads/lead-project';
import type { Fact } from '@/components/leads/lead-show-body';

const facts: Fact[] = [
    { label: 'Offre visée', value: 'Confié' },
    {
        label: 'Budget mensuel',
        value: '2 000 € / mois',
        badge: 'Correct',
        badgeTone: 'good',
    },
    { label: 'Quartiers visés', value: 'Non renseigné', empty: true },
];

describe('LeadProject', () => {
    it('renders each fact as a two-column description list with badges and the map behind a toggle', async () => {
        const user = userEvent.setup();
        render(<LeadProject facts={facts} map={<div>Carte</div>} />);

        expect(screen.getByText('Offre visée')).toBeInTheDocument();
        expect(screen.getByText('Confié')).toBeInTheDocument();
        expect(screen.getByText('Correct')).toBeInTheDocument();
        expect(screen.getByText('Non renseigné')).toBeInTheDocument();
        // La carte est repliée par défaut pour alléger la fiche.
        expect(screen.queryByText('Carte')).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Voir la carte des quartiers' }),
        );
        expect(screen.getByText('Carte')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Masquer la carte' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Offre visée').tagName).toBe('DT');
        expect(screen.getByText('Confié').tagName).toBe('DD');
        expect(screen.getByText('Confié').closest('dl')).toHaveClass(
            'sm:grid-cols-2',
        );
    });
});
