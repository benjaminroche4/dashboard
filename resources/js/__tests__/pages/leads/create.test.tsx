import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, put, transform } = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    transform: vi.fn(),
}));

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>();

    return {
        ...actual,
        Head: () => null,
        Link: ({
            href,
            children,
        }: {
            href: { url: string };
            children: ReactNode;
        }) => <a href={href.url}>{children}</a>,
        useForm: (initial: Record<string, unknown>) => useFormStub(initial),
    };
});

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {},
        processing: false,
        setData: (
            keyOrUpdater:
                | string
                | ((
                      current: Record<string, unknown>,
                  ) => Record<string, unknown>),
            value?: unknown,
        ) =>
            setDataState((current) =>
                typeof keyOrUpdater === 'function'
                    ? keyOrUpdater(current)
                    : { ...current, [keyOrUpdater]: value },
            ),
        transform,
        post,
        put,
    };
}

import LeadsCreate from '@/pages/leads/create';

const props = {
    offers: [
        {
            value: 'accompagne' as const,
            label: 'Accompagné',
            description: 'Offre Accompagné',
            price_cents: 119_000,
        },
        {
            value: 'confie' as const,
            label: 'Confié',
            description: 'Offre Confié',
            price_cents: 219_000,
        },
    ],
    sources: [
        { value: 'website' as const, label: 'Site web' },
        { value: 'referral' as const, label: 'Recommandation' },
    ],
    currencies: [
        { value: 'EUR' as const, label: 'Euro (EUR)' },
        { value: 'CHF' as const, label: 'Franc suisse (CHF)' },
    ],
    defaultCurrency: 'EUR' as const,
    languages: [
        { value: 'fr' as const, label: 'Français' },
        { value: 'en' as const, label: 'Anglais' },
    ],
    propertyTypes: [
        { value: 'studio' as const, label: 'Studio' },
        { value: 't2' as const, label: 'T2' },
    ],
    durations: [
        { value: 'long' as const, label: 'Long terme · 12 mois et plus' },
    ],
    guarantors: [{ value: 'garantme' as const, label: 'Garantme' }],
    furnishedOptions: [{ value: 'furnished' as const, label: 'Meublé' }],
    recontactChannels: [{ value: 'phone' as const, label: 'Téléphone' }],
};

describe('Converting Machine page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders the three sections and posts the lead with the budget in cents', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Converting Machine',
        );
        expect(
            screen.getByRole('heading', { name: 'Contact' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Projet logement' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Qualité du lead' }),
        ).toBeInTheDocument();

        await user.type(screen.getByLabelText('Prénom'), 'Léa');
        await user.type(screen.getByLabelText('Nom'), 'Durand');
        expect(
            within(screen.getByLabelText('Passeport du lead')).getByText(
                'Léa Durand',
            ),
        ).toBeInTheDocument();
        await user.type(screen.getByLabelText('E-mail'), 'lea@example.com');
        await user.click(screen.getByRole('radio', { name: 'Confié' }));
        await user.type(screen.getByLabelText('Budget mensuel (€)'), '2500');
        await user.type(screen.getByLabelText('Téléphone'), '6 12 34 56 78');
        await user.click(
            screen.getByRole('button', { name: '3e arrondissement' }),
        );
        await user.click(
            screen.getByRole('button', { name: '11e arrondissement' }),
        );
        expect(screen.getAllByText('3e, 11e').length).toBeGreaterThan(0);
        await user.click(screen.getByRole('button', { name: 'Tout Paris' }));
        expect(
            screen.getAllByText('Tout Paris', { selector: 'p, dd' }).length,
        ).toBeGreaterThan(0);
        await user.click(screen.getByRole('button', { name: 'T2' }));
        await user.click(screen.getByRole('radio', { name: '4 sur 5' }));
        expect(screen.getByText('4 / 5')).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', {
                name: 'Complétude du passeport',
            }),
        ).toHaveAttribute('aria-valuenow', '64');
        await user.click(
            screen.getByRole('button', { name: 'Ajouter le lead' }),
        );

        expect(post).toHaveBeenCalledWith('/leads');
        const transformer = transform.mock.calls.at(-1)?.[0] as (
            data: Record<string, unknown>,
        ) => Record<string, unknown>;
        const payload = transformer({
            offer: '',
            arrival_at: '',
            recontact_at: '',
            duration: '',
            guarantor: '',
            furnished: '',
            recontact_channel: '',
            budget: '2500',
        });
        expect(payload.budget_cents).toBe(250_000);
        expect(payload.offer).toBeNull();
        expect(payload.arrival_at).toBeNull();
    });

    it('edits an existing lead and puts to the update route', async () => {
        const user = userEvent.setup();
        render(
            <LeadsCreate
                {...props}
                lead={{
                    id: 7,
                    name: 'Léa Durand',
                    first_name: 'Léa',
                    last_name: 'Durand',
                    email: 'lea@example.com',
                    phone: '+41 79 000 00 00',
                    company: 'Nestlé',
                    language: 'en',
                    offer: 'confie',
                    source: 'referral',
                    source_note: '',
                    arrival_at: '2026-11-01',
                    budget: '2500',
                    currency: 'EUR',
                    origin_city: 'Genève',
                    districts: [3, 4],
                    property_types: ['t2'],
                    duration: 'long',
                    guarantor: '',
                    furnished: 'furnished',
                    message: '',
                    score: 4,
                    recontact_channel: '',
                    recontact_at: '',
                    qualification_note: '',
                }}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Modifier Léa Durand',
        );
        expect(screen.getByLabelText('Prénom')).toHaveValue('Léa');
        expect(screen.getByLabelText('Téléphone')).toHaveValue('79 000 00 00');
        expect(screen.getByLabelText('Société')).toHaveValue('Nestlé');
        expect(screen.getAllByText('3e, 4e').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Téléphone')).toHaveValue('79 000 00 00');
        expect(screen.getByLabelText('Société')).toHaveValue('Nestlé');
        expect(screen.getAllByText('3e, 4e').length).toBeGreaterThan(0);
        expect(
            screen.getByRole('button', { name: '3e arrondissement' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('radio', { name: 'Confié' })).toBeChecked();
        expect(screen.getByText('4 / 5')).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', {
                name: 'Complétude du passeport',
            }),
        ).toHaveAttribute('aria-valuenow', '91');
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/leads/7',
        );

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(put).toHaveBeenCalledWith('/leads/7');
        expect(post).not.toHaveBeenCalled();
    });
});
