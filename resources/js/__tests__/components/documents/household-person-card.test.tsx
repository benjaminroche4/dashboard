import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    HouseholdPersonCard,
    type HouseholdPersonErrors,
} from '@/components/documents/household-person-card';
import { emptyPerson } from '@/lib/document-request-form';
import { catalog, roles } from '@/test/fixtures/document-request';
import type { HouseholdPersonForm } from '@/types';

function Harness({
    onRemove,
    errors,
    total,
}: {
    onRemove?: () => void;
    errors?: HouseholdPersonErrors;
    total?: number;
}) {
    const [person, setPerson] = useState<HouseholdPersonForm>(emptyPerson());

    return (
        <>
            <HouseholdPersonCard
                index={0}
                total={total}
                person={person}
                catalog={catalog}
                roles={roles}
                errors={errors}
                onRemove={onRemove}
                onChange={setPerson}
            />
            <output data-testid="state">{JSON.stringify(person)}</output>
        </>
    );
}

describe('HouseholdPersonCard', () => {
    it('shows the name fields, the role choices, the categories with icons and hints, and the counter', () => {
        render(<Harness total={3} />);

        expect(
            screen.getByRole('heading', { name: 'Personne 1' }),
        ).toBeInTheDocument();
        expect(screen.queryByText('Personne 1 sur 3')).not.toBeInTheDocument();
        expect(screen.getByLabelText(/Prénom/)).toHaveValue('');
        expect(screen.getByLabelText(/^Nom/)).toHaveValue('');
        expect(screen.getByLabelText('Locataire')).toBeChecked();
        expect(screen.getByLabelText('Garant')).not.toBeChecked();
        const identity = screen.getByRole('group', { name: 'Identité' });
        expect(identity).toBeInTheDocument();
        expect(identity.querySelector('svg')).not.toBeNull();
        expect(screen.getByText('Recto et verso')).toBeInTheDocument();
        expect(screen.getByText('0 cochée(s)')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Retirer/ }),
        ).not.toBeInTheDocument();
    });

    it('updates the heading as the name is typed, with the position above it', async () => {
        const user = userEvent.setup();
        render(<Harness total={3} />);

        await user.type(screen.getByLabelText(/Prénom/), 'Léa');
        await user.type(screen.getByLabelText(/^Nom/), 'Martin');

        expect(
            screen.getByRole('heading', { name: 'Léa Martin' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Personne 1 sur 3')).toBeInTheDocument();
    });

    it('changes the role, checks documents and toggles a whole category', async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(screen.getByLabelText('Garant'));
        await user.click(screen.getByLabelText(/3 derniers bulletins/));
        expect(screen.getByText('1 cochée(s)')).toBeInTheDocument();

        const toggleIdentity = screen.getByRole('button', {
            name: 'Tout cocher Identité pour la personne 1',
        });
        expect(toggleIdentity).toHaveTextContent('Tous');
        await user.click(toggleIdentity);
        expect(screen.getByText('3 cochée(s)')).toBeInTheDocument();
        expect(screen.getByText('2/2')).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Décocher Identité pour la personne 1',
            }),
        ).toHaveTextContent('Décocher');

        const state = JSON.parse(
            screen.getByTestId('state').textContent ?? '{}',
        ) as HouseholdPersonForm;
        expect(state.role).toBe('guarantor');
        expect(state.documents).toEqual([
            'payslips',
            'identity_document',
            'family_record_book',
        ]);
    });

    it('shows the errors and the remove button when provided', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        render(
            <Harness
                onRemove={onRemove}
                errors={{
                    first_name: 'Le prénom est obligatoire.',
                    documents: 'Cochez au moins une pièce.',
                }}
            />,
        );

        expect(
            screen.getByText('Le prénom est obligatoire.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Cochez au moins une pièce.'),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Retirer la personne 1' }),
        );
        expect(onRemove).toHaveBeenCalledOnce();
    });
});
