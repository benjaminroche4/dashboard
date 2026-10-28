import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { patch, destroy } = vi.hoisted(() => ({
    patch: vi.fn(),
    destroy: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { patch, delete: destroy },
}));

import { LeadPeopleCard } from '@/components/leads/lead-people-card';
import { makeLeadPeople, makeLeadPerson } from '@/test/fixtures/lead';

const employmentStatuses = [
    { value: 'cdi', label: 'CDI' },
    { value: 'etudiant', label: 'Étudiant' },
];

describe('LeadPeopleCard', () => {
    it('shows the lead as first person with his professional rows editable in place, and offers to add a second one', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <LeadPeopleCard
                people={makeLeadPeople()}
                employmentStatuses={employmentStatuses}
                onSave={onSave}
                addUrl="/locataires/x/people/co"
                removeUrl="/locataires/x/people/co"
            />,
        );

        const lead = within(screen.getByRole('region', { name: 'Léa Durand' }));
        expect(lead.getByText('Lead')).toBeInTheDocument();
        expect(
            lead.getByText('lea@example.com · +33 6 12 34 56 78'),
        ).toBeInTheDocument();
        // L'identité du lead vit dans son contact : pas d'e-mail à modifier ici.
        expect(
            lead.queryByRole('button', { name: 'Modifier E-mail' }),
        ).toBeNull();
        expect(lead.getAllByText('Non renseigné')).toHaveLength(3);

        await user.click(
            lead.getByRole('button', { name: 'Modifier Employeur' }),
        );
        await user.type(
            lead.getByRole('textbox', { name: 'Employeur' }),
            'Axa{Enter}',
        );
        expect(onSave).toHaveBeenCalledWith('primary', 'employer', 'Axa');

        await user.click(
            lead.getByRole('button', { name: 'Modifier Situation pro' }),
        );
        await user.click(lead.getByRole('combobox', { name: 'Situation pro' }));
        await user.click(await screen.findByRole('option', { name: 'CDI' }));
        expect(onSave).toHaveBeenCalledWith(
            'primary',
            'employment_status',
            'cdi',
        );

        // « Ajouter une personne » demande un prénom et un nom, puis poste sur l'emplacement « co ».
        await user.click(
            screen.getByRole('button', { name: 'Ajouter une personne' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Ajouter une personne',
        });
        await user.type(within(dialog).getByLabelText('Prénom'), 'Marc');
        await user.type(within(dialog).getByLabelText('Nom'), 'Durand');
        await user.click(
            within(dialog).getByRole('button', { name: 'Ajouter' }),
        );
        expect(patch).toHaveBeenCalledWith(
            '/locataires/x/people/co',
            expect.objectContaining({
                first_name: 'Marc',
                last_name: 'Durand',
            }),
            expect.anything(),
        );
    });

    it('shows the second person with her own contact rows, her income, and removes her', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <LeadPeopleCard
                people={makeLeadPeople({
                    co: makeLeadPerson({
                        slot: 'co',
                        first_name: 'Marc',
                        last_name: 'Durand',
                        name: 'Marc Durand',
                        email: null,
                        phone: null,
                        employment_status: 'etudiant',
                        employment_status_label: 'Étudiant',
                        income_cents: 120_000,
                    }),
                })}
                employmentStatuses={employmentStatuses}
                onSave={onSave}
                addUrl="/locataires/x/people/co"
                removeUrl="/locataires/x/people/co"
            />,
        );

        const co = within(screen.getByRole('region', { name: 'Marc Durand' }));
        expect(co.getByText('Seconde personne')).toBeInTheDocument();
        expect(co.getByText('Étudiant')).toBeInTheDocument();
        expect(co.getByText(/1\s?200,00\s?€ \/ mois/)).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Ajouter une personne' }),
        ).toBeNull();

        await user.click(co.getByRole('button', { name: 'Modifier E-mail' }));
        await user.type(
            co.getByRole('textbox', { name: 'E-mail' }),
            'marc@example.com{Enter}',
        );
        expect(onSave).toHaveBeenCalledWith('co', 'email', 'marc@example.com');

        await user.click(co.getByRole('button', { name: 'Retirer' }));
        expect(destroy).toHaveBeenCalledWith(
            '/locataires/x/people/co',
            expect.anything(),
        );
    });

    it('stays read-only without a save handler', () => {
        render(
            <LeadPeopleCard
                people={makeLeadPeople()}
                employmentStatuses={employmentStatuses}
                addUrl="/x"
                removeUrl="/x"
            />,
        );

        expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Ajouter une personne' }),
        ).toBeNull();
    });
});
