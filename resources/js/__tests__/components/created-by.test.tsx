import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreatedBy } from '@/components/created-by';

describe('CreatedBy', () => {
    it('shows the initials, the name and the formatted date', () => {
        render(
            <CreatedBy
                name="Admin Deux"
                avatar={null}
                date="2026-09-06T10:00:00+02:00"
            />,
        );

        expect(screen.getByText('AD')).toBeInTheDocument();
        expect(screen.getByText('Admin Deux')).toBeInTheDocument();
        expect(screen.getByText('6 septembre 2026')).toBeInTheDocument();
        expect(screen.getByText('créée par')).toBeInTheDocument();
    });

    it('falls back to « inconnu » without a name and accepts a custom verb', () => {
        render(<CreatedBy name={null} verb="par" />);

        expect(screen.getByText('inconnu')).toBeInTheDocument();
        expect(screen.getByText('par')).toBeInTheDocument();
        expect(screen.queryByText(/^le/)).not.toBeInTheDocument();
    });
});
