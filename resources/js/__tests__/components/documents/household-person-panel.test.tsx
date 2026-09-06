import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HouseholdPersonPanel } from '@/components/documents/household-person-panel';
import { makeDocumentRequestDetail } from '@/test/fixtures/document-request';

const person = makeDocumentRequestDetail().persons[0]!;

describe('HouseholdPersonPanel', () => {
    it('shows the name, role, count and the documents grouped by category', () => {
        render(<HouseholdPersonPanel person={person} index={0} />);

        expect(
            screen.getByRole('heading', { name: 'Léa Martin' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Locataire')).toBeInTheDocument();
        expect(screen.getByText('2 pièces')).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Identité' }),
        ).toHaveTextContent("Passeport ou carte d'identité");
        expect(
            screen.getByRole('region', { name: 'Travail' }),
        ).toHaveTextContent('3 derniers bulletins de salaire');
    });

    it('collapses to the name only and expands again', async () => {
        const user = userEvent.setup();
        render(<HouseholdPersonPanel person={person} index={0} />);

        await user.click(
            screen.getByRole('button', { name: 'Replier Léa Martin' }),
        );

        expect(
            screen.queryByRole('region', { name: 'Identité' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Léa Martin' }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Déplier Léa Martin' }),
        );
        expect(
            screen.getByRole('region', { name: 'Identité' }),
        ).toBeInTheDocument();
    });

    it('falls back to the person number without a name', () => {
        render(
            <HouseholdPersonPanel
                person={{ ...person, name: '' }}
                index={1}
                defaultOpen={false}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Personne 2' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Identité' }),
        ).not.toBeInTheDocument();
    });
});
