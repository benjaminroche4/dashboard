import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { routerPost, routerDelete, patch } = vi.hoisted(() => ({
    routerPost: vi.fn(),
    routerDelete: vi.fn(),
    patch: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { post: routerPost, delete: routerDelete },
    usePage: () => ({ props: { features: { assistant: true } } }),
    useForm: (initial: Record<string, unknown>) => {
        const [data, setDataState] = useState(initial);

        return {
            data,
            errors: {} as Record<string, string | undefined>,
            processing: false,
            setData: (key: string | Record<string, unknown>, value?: unknown) =>
                setDataState((current) =>
                    typeof key === 'string'
                        ? { ...current, [key]: value }
                        : { ...current, ...key },
                ),
            clearErrors: () => undefined,
            transform: () => undefined,
            patch: (url: string, options: unknown) => patch(url, data, options),
        };
    },
}));

import { AgencyProfileCard } from '@/components/real-estate/agency-profile-card';
import { makeAgency } from '@/test/fixtures/real-estate';
import type { AgencyDetail, ProfileOptions } from '@/types';

const options: ProfileOptions = {
    specialties: [
        { value: 'furnished', label: 'Meublé' },
        { value: 'expats', label: 'Expatriés' },
    ],
    languages: [{ value: 'en', label: 'Anglais' }],
    mandateTypes: [{ value: 'rental', label: 'Location' }],
};

const urls = {
    profile: '/agencies/a1/profile',
    enrich: '/agencies/a1/enrich',
    apply: '/agencies/a1/enrich/apply',
    dismiss: '/agencies/a1/enrich',
};

function agency(overrides: Partial<AgencyDetail> = {}): AgencyDetail {
    return {
        ...makeAgency(),
        agents: [],
        properties: [],
        has_profile: false,
        ...overrides,
    };
}

describe('AgencyProfileCard', () => {
    it('invites to fill the profile or read the website when nothing is known', async () => {
        const user = userEvent.setup();
        render(
            <AgencyProfileCard
                scope="agency"
                agency={agency()}
                options={options}
                urls={urls}
            />,
        );

        expect(
            screen.getByText(/Rien de renseigné pour l’instant/),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Lire le site avec l’IA' }),
        );
        expect(routerPost).toHaveBeenCalledWith(
            urls.enrich,
            {},
            expect.anything(),
        );
    });

    it('shows the profile, and saves it from the dialog with rents in cents', async () => {
        const user = userEvent.setup();
        render(
            <AgencyProfileCard
                scope="agency"
                agency={agency({
                    has_profile: true,
                    districts: [3, 11],
                    specialty_labels: ['Meublé'],
                    specialties: ['furnished'],
                    language_labels: ['Anglais'],
                    languages: ['en'],
                    mandate_labels: [],
                    mandate_types: [],
                    rent_min_cents: 100_000,
                    rent_max_cents: 250_000,
                    fee_note: '12 €/m²',
                    accepts_garantme: true,
                    accepts_foreign_files: null,
                })}
                options={options}
                urls={urls}
            />,
        );

        const card = screen.getByRole('region', { name: 'Profil de matching' });
        expect(within(card).getByText('3e')).toBeInTheDocument();
        expect(within(card).getByText('11e')).toBeInTheDocument();
        expect(
            within(card).getByText('1 000 € – 2 500 € / mois'),
        ).toBeInTheDocument();
        expect(within(card).getByText('Oui')).toBeInTheDocument();

        await user.click(
            within(card).getByRole('button', { name: 'Modifier le profil' }),
        );
        const dialog = screen.getByRole('dialog');
        expect(
            within(dialog).getByRole('button', { name: '20e' }),
        ).toHaveAttribute('data-state', 'off');
        await user.click(within(dialog).getByRole('button', { name: '20e' }));
        await user.click(
            within(dialog).getByRole('button', {
                name: 'Enregistrer le profil',
            }),
        );

        expect(patch).toHaveBeenCalledWith(
            urls.profile,
            expect.objectContaining({ districts: [3, 11, 20] }),
            expect.anything(),
        );
    });

    it('shows the assistant proposal for review, applied or dismissed', async () => {
        const user = userEvent.setup();
        render(
            <AgencyProfileCard
                scope="agency"
                agency={agency({
                    ai_profile: {
                        summary: 'Agence de quartier, meublé pour expatriés.',
                        notes: 'Dossier complet exigé.',
                        districts: [11],
                        specialties: ['furnished', 'expats'],
                        languages: ['en'],
                        mandate_types: null,
                        fee_note: null,
                        rent_min_cents: 90_000,
                        rent_max_cents: null,
                        accepts_garantme: true,
                        accepts_foreign_files: null,
                    },
                })}
                options={options}
                urls={urls}
            />,
        );

        const note = screen.getByRole('note');
        expect(within(note).getByText('Profil proposé')).toBeInTheDocument();
        expect(within(note).getByText('Meublé, Expatriés')).toBeInTheDocument();
        expect(
            within(note).getByText('à partir de 900 € / mois'),
        ).toBeInTheDocument();

        await user.click(
            within(note).getByRole('button', { name: 'Appliquer au profil' }),
        );
        expect(routerPost).toHaveBeenCalledWith(
            urls.apply,
            {},
            expect.anything(),
        );
        await user.click(within(note).getByRole('button', { name: 'Ignorer' }));
        expect(routerDelete).toHaveBeenCalledWith(
            urls.dismiss,
            expect.anything(),
        );
    });
});
