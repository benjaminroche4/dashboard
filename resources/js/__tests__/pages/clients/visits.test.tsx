import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({ Head: () => null }));

import ClientsVisits from '@/pages/clients/visits';

describe('Clients visits page', () => {
    it('shows an empty state until visits exist', () => {
        render(<ClientsVisits />);

        expect(
            screen.getByRole('heading', { name: 'Visites' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Aucune visite planifiée pour le moment'),
        ).toBeInTheDocument();
        expect(ClientsVisits.layout.breadcrumbs[1]?.href.url).toBe(
            '/clients/visits',
        );
    });
});
