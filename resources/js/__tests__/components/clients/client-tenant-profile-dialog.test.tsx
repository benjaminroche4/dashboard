import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch, setData } = vi.hoisted(() => ({
    patch: vi.fn(),
    setData: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
    const { useState } = await import('react');

    return {
        useForm: (initial: Record<string, unknown>) => {
            const [data, setState] = useState(initial);

            return {
                data,
                errors: {},
                processing: false,
                clearErrors: vi.fn(),
                setData: (key: string, value: unknown) => {
                    setData(key, value);
                    setState((current) => ({ ...current, [key]: value }));
                },
                patch,
            };
        },
    };
});

import { ClientTenantProfileDialog } from '@/components/clients/client-tenant-profile-dialog';
import {
    employmentStatuses,
    makeTenantProfile,
    residencyStatuses,
} from '@/test/fixtures/tenant-profile';
import type { TenantProfile } from '@/types';

const open = (profile: TenantProfile = makeTenantProfile()) =>
    render(
        <ClientTenantProfileDialog
            clientUuid="client-uuid"
            slot="primary"
            profile={profile}
            residencyStatuses={residencyStatuses}
            employmentStatuses={employmentStatuses}
            open
            onOpenChange={vi.fn()}
        />,
    );

describe('ClientTenantProfileDialog', () => {
    beforeEach(() => {
        patch.mockReset();
        setData.mockReset();
    });

    it('shows the three blocks filled with the saved details', () => {
        open();

        expect(
            screen.getByRole('heading', {
                name: 'Informations de Léa Durand',
            }),
        ).toBeInTheDocument();
        for (const block of [
            'État civil',
            'Séjour',
            'Situation professionnelle',
        ]) {
            expect(
                screen.getByRole('region', { name: block }),
            ).toBeInTheDocument();
        }

        expect(screen.getByLabelText('Date de naissance')).toHaveValue(
            '1994-05-12',
        );
        expect(screen.getByLabelText('Nationalité')).toHaveValue('Brésilienne');
        expect(screen.getByLabelText('Employeur ou école')).toHaveValue(
            'Doctolib',
        );
        // Le revenu est saisi en euros, pas en centimes.
        expect(screen.getByLabelText('Revenu net mensuel (€)')).toHaveValue(
            4200.5,
        );
    });

    it('hides the permit fields for a citizen of the European Union', () => {
        open(
            makeTenantProfile({
                residency_status: 'ue',
                residency_label: 'Citoyen de l’Union européenne',
                residency_needs_document: false,
            }),
        );

        const residency = within(
            screen.getByRole('region', { name: 'Séjour' }),
        );
        expect(
            residency.queryByLabelText('Numéro du titre'),
        ).not.toBeInTheDocument();
        expect(
            residency.queryByLabelText('Valable jusqu’au'),
        ).not.toBeInTheDocument();
    });

    it('capitalizes the nationality and patches the tenant route', async () => {
        const user = userEvent.setup();
        open();

        const nationality = screen.getByLabelText('Nationalité');
        await user.clear(nationality);
        await user.type(nationality, 'française');
        await user.tab();
        expect(setData).toHaveBeenLastCalledWith('nationality', 'Française');

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(patch).toHaveBeenCalledWith(
            '/clients/client-uuid/tenants/primary',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
