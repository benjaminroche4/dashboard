import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, put, transform, visit, toastError } = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    transform: vi.fn(),
    visit: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { error: toastError } }));

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>();

    return {
        ...actual,
        Head: () => null,
        Link: ({
            href,
            children,
        }: {
            href: { url: string } | string;
            children: ReactNode;
        }) => (
            <a href={typeof href === 'string' ? href : href.url}>{children}</a>
        ),
        router: { visit },
        usePage: () => ({
            props: {
                auth: { user: { id: 1, name: 'Admin' } },
                staff: [
                    { id: 1, name: 'Admin', role: 'admin', avatar: null },
                    { id: 2, name: 'Camille', role: 'member', avatar: null },
                ],
            },
        }),
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
            summary: 'Vous cherchez, nous vous guidons.',
            price_cents: 119_000,
        },
        {
            value: 'confie' as const,
            label: 'Confié',
            description: 'Offre Confié',
            summary: 'Nous trouvons votre logement.',
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
    guarantors: [
        { value: 'garantme' as const, label: 'Garantme' },
        { value: 'bancaire' as const, label: 'Garantie bancaire' },
    ],
    furnishedOptions: [{ value: 'furnished' as const, label: 'Meublé' }],
    recontactChannels: [{ value: 'phone' as const, label: 'Téléphone' }],
};

const lead = {
    id: 7,
    uuid: '0199a9a0-0000-7000-8000-000000000007',
    name: 'Léa Durand',
    first_name: 'Léa',
    last_name: 'Durand',
    email: 'lea@example.com',
    phone: '+41 79 000 00 00',
    company: 'Nestlé',
    language: 'en' as const,
    offer: 'confie' as const,
    source: 'referral' as const,
    source_note: '',
    arrival_at: '2026-11-01',
    budget: '2500',
    currency: 'EUR' as const,
    origin_city: 'Genève',
    districts: [3, 4],
    property_types: ['t2' as const],
    duration: 'long' as const,
    guarantors: [],
    furnished: 'furnished' as const,
    message: '',
    score: 4,
    recontact_channel: '' as const,
    recontact_at: '',
    qualification_note: '',
    assigned_to: 2,
    segment: 'tenant' as const,
};

/** Remplit l'étape 1 avec le minimum requis. */
async function fillContact(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Prénom'), 'Léa');
    await user.type(screen.getByLabelText('Nom'), 'Durand');
    await user.type(screen.getByLabelText('E-mail'), 'lea@example.com');
}

describe('Converting Machine page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('offers the closing guide next to the title', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );

        expect(
            screen.getByRole('dialog', { name: 'Guide de closing' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
    });

    it('describes each offer in one sentence', () => {
        render(<LeadsCreate {...props} />);

        expect(
            screen.getByText('Vous cherchez, nous vous guidons.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Nous trouvons votre logement.'),
        ).toBeInTheDocument();
    });

    it('walks through the three steps and posts the lead with the budget in cents', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Converting Machine',
        );
        expect(
            screen.getByRole('heading', { name: 'Contact' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Budget et calendrier' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Contact', current: 'step' }),
        ).toBeInTheDocument();

        await fillContact(user);
        await user.click(screen.getByRole('radio', { name: 'Confié' }));
        await user.type(screen.getByLabelText('Téléphone'), '6 12 34 56 78');
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByRole('heading', { name: 'Budget et calendrier' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Projet logement',
                current: 'step',
            }),
        ).toBeInTheDocument();
        await user.type(
            screen.getByLabelText('Budget mensuel (€ / mois)'),
            '2500',
        );
        await user.click(
            screen.getByRole('button', { name: '3e arrondissement' }),
        );
        await user.click(
            screen.getByRole('button', { name: '11e arrondissement' }),
        );
        expect(screen.getByText('3e, 11e')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Tout Paris' }));
        expect(
            screen.getByText('Tout Paris', { selector: 'p' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByRole('heading', { name: 'Qualité du lead' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: '4 sur 5' }));
        expect(screen.getByText('4 / 5')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Ajouter le lead' }),
        );

        expect(post).toHaveBeenCalledWith('/locataires');
        const transformer = transform.mock.calls.at(-1)?.[0] as (
            data: Record<string, unknown>,
        ) => Record<string, unknown>;
        const payload = transformer({
            offer: '',
            arrival_at: '',
            recontact_at: '',
            duration: '',
            guarantors: [],
            furnished: '',
            recontact_channel: '',
            budget: '2500',
        });
        expect(payload.budget_cents).toBe(250_000);
        expect(payload.offer).toBeNull();
    });

    it('refuses to leave step 1 while the contact is incomplete', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByRole('button', { name: 'Contact', current: 'step' }),
        ).toBeInTheDocument();
        expect(toastError).toHaveBeenCalledWith(
            'Étape incomplète',
            expect.any(String),
        );
        expect(screen.getByText('Le nom est obligatoire.')).toBeInTheDocument();
        expect(screen.getByLabelText('Nom')).toHaveFocus();
        expect(
            screen.getByRole('button', { name: /Projet logement/ }),
        ).toBeDisabled();
    });

    it('lets steps 2 and 3 be skipped and saves from step 3', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));
        await user.click(screen.getByRole('button', { name: 'Passer' }));

        expect(
            screen.getByRole('button', {
                name: 'Qualité du lead',
                current: 'step',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Admin (moi)' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Camille' }));
        expect(screen.getByRole('radio', { name: 'Camille' })).toBeChecked();

        await user.click(
            screen.getByRole('button', { name: 'Passer et enregistrer' }),
        );

        expect(post).toHaveBeenCalledWith('/locataires');
    });

    it('goes back with « Précédent » and through the stepper', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));
        await user.click(screen.getByRole('button', { name: 'Précédent' }));

        expect(
            screen.getByRole('button', { name: 'Contact', current: 'step' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Prénom')).toHaveValue('Léa');

        await user.click(
            screen.getByRole('button', { name: /Projet logement/ }),
        );

        expect(
            screen.getByRole('button', {
                name: 'Projet logement',
                current: 'step',
            }),
        ).toBeInTheDocument();
    });

    it('edits an existing lead from any step and puts to the update route', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} lead={lead} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Modifier Léa Durand',
        );
        expect(screen.getByLabelText('Prénom')).toHaveValue('Léa');
        expect(screen.getByLabelText('Téléphone')).toHaveValue('79 000 00 00');
        expect(screen.getByLabelText('Société')).toHaveValue('Nestlé');
        expect(screen.getByRole('radio', { name: 'Confié' })).toBeChecked();
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000007',
        );

        await user.click(
            screen.getByRole('button', { name: /Projet logement/ }),
        );
        expect(
            screen.getByRole('button', { name: '3e arrondissement' }),
        ).toHaveAttribute('aria-pressed', 'true');

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(put).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000007',
        );
        expect(post).not.toHaveBeenCalled();
    });

    it('validates everything on ⌘+Enter and jumps to the step in error', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await user.keyboard('{Meta>}{Enter}{/Meta}');

        expect(post).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalledWith(
            'Formulaire incomplet',
            expect.any(String),
        );
        expect(
            await screen.findByText('Le nom est obligatoire.'),
        ).toBeInTheDocument();
        expect(
            screen.getAllByText('Indiquez au moins un e-mail ou un téléphone.')
                .length,
        ).toBe(2);
        expect(screen.getByLabelText('Nom')).toHaveFocus();
    });

    it('warns about duplicates when a known e-mail is typed', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => [
                    {
                        id: 9,
                        uuid: '0199a9a0-0000-7000-8000-000000000009',
                        name: 'Léa Durand',
                        email: 'lea@example.com',
                        phone: null,
                        status_label: 'En cours',
                        url: '/locataires/0199a9a0-0000-7000-8000-000000000009',
                    },
                ],
            })),
        );
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await user.type(screen.getByLabelText('E-mail'), 'lea@example.com');

        expect(
            await screen.findByText('Un lead existe déjà avec ce contact'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-000000000009',
        );
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/locataires/duplicates?'),
            expect.anything(),
        );
        vi.unstubAllGlobals();
    });

    it('warns on a tight budget', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        await user.type(
            screen.getByLabelText('Budget mensuel (€ / mois)'),
            '1500',
        );
        expect(screen.queryByText('Budget serré')).not.toBeInTheDocument();

        await user.clear(screen.getByLabelText('Budget mensuel (€ / mois)'));
        await user.type(
            screen.getByLabelText('Budget mensuel (€ / mois)'),
            '1000',
        );

        expect(await screen.findByText('Budget serré')).toBeInTheDocument();

        await user.clear(screen.getByLabelText('Budget mensuel (€ / mois)'));
        await user.type(
            screen.getByLabelText('Budget mensuel (€ / mois)'),
            '3000',
        );
        expect(screen.queryByText('Budget serré')).not.toBeInTheDocument();
    });

    it('leaves the page on Escape', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await user.keyboard('{Escape}');

        expect(visit).toHaveBeenCalledWith('/locataires');
    });

    it('names the score and answers conditions with segments', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        const duration = screen.getByRole('radio', {
            name: 'Long terme · 12 mois et plus',
        });
        await user.click(duration);
        expect(duration).toHaveAttribute('data-state', 'on');
        await user.click(duration);
        expect(duration).toHaveAttribute('data-state', 'off');

        // Le garant accepte plusieurs réponses.
        await user.click(screen.getByRole('button', { name: 'Garantme' }));
        await user.click(
            screen.getByRole('button', { name: 'Garantie bancaire' }),
        );
        expect(
            screen.getByRole('button', { name: 'Garantme' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', { name: 'Garantie bancaire' }),
        ).toHaveAttribute('aria-pressed', 'true');

        await user.click(screen.getByRole('button', { name: 'Continuer' }));
        expect(screen.getByText('Non évaluée')).toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: '5 sur 5' }));
        expect(screen.getByText('Prêt à signer')).toBeInTheDocument();
        expect(screen.getByText('5 / 5')).toBeInTheDocument();
    });

    it('warns when the arrival is less than 20 days away', async () => {
        const user = userEvent.setup();
        const soon = new Date();
        soon.setDate(soon.getDate() + 5);
        const later = new Date();
        later.setDate(later.getDate() + 60);

        const { unmount } = render(
            <LeadsCreate
                {...props}
                lead={{ ...lead, arrival_at: soon.toISOString().slice(0, 10) }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Projet logement' }),
        );

        expect(screen.getByText('Emménagement imminent')).toBeInTheDocument();
        expect(screen.getByText(/dans 5 jours/)).toBeInTheDocument();

        unmount();
        render(
            <LeadsCreate
                {...props}
                lead={{
                    ...lead,
                    arrival_at: later.toISOString().slice(0, 10),
                }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Projet logement' }),
        );

        expect(
            screen.queryByText('Emménagement imminent'),
        ).not.toBeInTheDocument();
    });
});
