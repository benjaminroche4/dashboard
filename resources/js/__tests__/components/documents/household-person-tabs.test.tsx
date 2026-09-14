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

        // Les pièces se lisent en tableau : une ligne par pièce, la
        // catégorie en tête de son groupe.
        const row = (label: string) =>
            screen.getByText(label).closest('tr') as HTMLElement;
        expect(
            within(row("Passeport ou carte d'identité")).getByText('Identité'),
        ).toBeInTheDocument();
        expect(
            within(row('3 derniers bulletins de salaire')).getByText('Travail'),
        ).toBeInTheDocument();
        expect(screen.getByText('Locataire')).toBeInTheDocument();

        // Chaque pièce dit où elle en est, et la personne résume le tout.
        expect(
            within(row("Passeport ou carte d'identité")).getByText('À déposer'),
        ).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '0',
        );
        // Plus de Data Table : ni filtre, ni menu des colonnes, ni sélection.
        expect(
            screen.queryByPlaceholderText('Filtrer par pièce…'),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/sélectionnée/)).not.toBeInTheDocument();
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

    it('lets a member who may edit the list add a file under a piece', () => {
        const { unmount } = render(
            <HouseholdPersonTabs
                persons={persons}
                requestUuid="req-1"
                canReview
            />,
        );
        expect(
            screen.getByRole('button', {
                name: "Ajouter un fichier pour Passeport ou carte d'identité",
            }),
        ).toBeInTheDocument();
        unmount();

        // En lecture seule, rien à verser.
        render(<HouseholdPersonTabs persons={persons} requestUuid="req-1" />);
        expect(
            screen.queryByRole('button', { name: /Ajouter un fichier/ }),
        ).not.toBeInTheDocument();
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
