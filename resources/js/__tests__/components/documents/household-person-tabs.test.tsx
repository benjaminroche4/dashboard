import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HouseholdPersonTabs } from '@/components/documents/household-person-tabs';
import { makeDocumentRequestDetail } from '@/test/fixtures/document-request';

const persons = makeDocumentRequestDetail().persons;

describe('HouseholdPersonTabs', () => {
    it('gives each person a tab, with its documents grouped by category', () => {
        render(<HouseholdPersonTabs persons={persons} />);

        // Une personne par onglet, la première ouverte.
        const first = screen.getByRole('tab', { name: /Léa Martin/ });
        expect(first).toHaveAttribute('data-state', 'active');
        expect(screen.getAllByRole('tab')).toHaveLength(persons.length);

        expect(
            within(screen.getByRole('region', { name: 'Identité' })).getByText(
                "Passeport ou carte d'identité",
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Travail' }),
        ).toHaveTextContent('3 derniers bulletins de salaire');
        expect(screen.getByText('Locataire')).toBeInTheDocument();
    });

    it('shows another person without leaving the page', async () => {
        const user = userEvent.setup();
        render(
            <HouseholdPersonTabs
                persons={[
                    persons[0]!,
                    {
                        ...persons[0]!,
                        name: 'Marc Durand',
                        role: 'Garant',
                        categories: [persons[0]!.categories[0]!],
                    },
                ]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: /Marc Durand/ }));

        expect(
            screen.getByRole('tab', { name: /Marc Durand/ }),
        ).toHaveAttribute('data-state', 'active');
        expect(screen.getByText('Garant')).toBeInTheDocument();
    });

    it('falls back to the person number without a name', () => {
        render(
            <HouseholdPersonTabs persons={[{ ...persons[0]!, name: '' }]} />,
        );

        expect(
            screen.getByRole('tab', { name: /Personne 1/ }),
        ).toBeInTheDocument();
    });
});
