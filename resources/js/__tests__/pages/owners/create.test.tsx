import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, put, transform, visit, toastError, latest } = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    transform: vi.fn(),
    visit: vi.fn(),
    toastError: vi.fn(),
    /** Dernières données du formulaire, pour rejouer le `transform` envoyé. */
    latest: { data: {} as Record<string, unknown> },
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
                features: { addressAutocomplete: false, googleMapsKey: null },
            },
        }),
        useForm: (initial: Record<string, unknown>) => useFormStub(initial),
    };
});

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);
    latest.data = data;

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

import OwnerLeadCreate from '@/pages/owners/create';
import { ownerLeadFormToPayload } from '@/lib/owner-lead-form';
import { makeOwnerLeadEditable } from '@/test/fixtures/lead';
import type { OwnerLeadForm } from '@/types';

const props = {
    languages: [
        { value: 'fr' as const, label: 'Français' },
        { value: 'en' as const, label: 'Anglais' },
    ],
    sources: [
        { value: 'website' as const, label: 'Site web' },
        { value: 'referral' as const, label: 'Recommandation' },
    ],
    propertyTypes: [
        { value: 'studio' as const, label: 'Studio' },
        { value: 't2' as const, label: 'T2' },
        { value: 'house' as const, label: 'Maison' },
    ],
    propertyStatuses: [
        { value: 'available' as const, label: 'Disponible' },
        { value: 'rented' as const, label: 'Loué' },
    ],
    leaseTypes: [
        { value: 'alur' as const, label: 'Loi Alur' },
        { value: 'mobility' as const, label: 'Bail mobilité' },
    ],
    orientations: [
        { value: 'north' as const, label: 'Nord' },
        { value: 'south' as const, label: 'Sud' },
    ],
    amenities: [
        'elevator',
        'balcony',
        'terrace',
        'wifi',
        'washing_machine',
        'dishwasher',
        'oven',
        'tv',
        'air_conditioning',
        'parking',
        'cellar',
        'garden',
        'dryer',
        'microwave',
    ].map((value, index) => ({
        value: value as OwnerLeadForm['property']['amenities'][number],
        label: `Équipement ${index + 1}`,
    })),
    furnishingOptions: [
        { value: 'furnished' as const, label: 'Meublé' },
        { value: 'unfurnished' as const, label: 'Vide' },
    ],
};

/** Remplit l'étape 1 avec le minimum requis. */
async function fillContact(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Prénom'), 'Paul');
    await user.type(screen.getByLabelText('Nom'), 'Roux');
    await user.type(screen.getByLabelText('E-mail'), 'paul@example.com');
}

describe('Owner Converting Machine page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('walks through the three steps and posts the property with amounts in cents', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Converting Machine',
        );
        expect(
            screen.getByRole('button', {
                name: 'Coordonnées',
                current: 'step',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Admin (moi)' }),
        ).toBeChecked();

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByRole('button', {
                name: 'Détail du bien',
                current: 'step',
            }),
        ).toBeInTheDocument();
        await user.type(
            screen.getByLabelText('Adresse du bien'),
            '12 rue de Rivoli, Paris',
        );
        await user.click(screen.getByRole('radio', { name: 'T2' }));
        await user.click(screen.getByRole('radio', { name: 'Disponible' }));
        await user.click(
            within(
                screen.getByRole('radiogroup', { name: 'Chambres' }),
            ).getByRole('radio', { name: '5+' }),
        );
        await user.type(screen.getByLabelText('Surface'), '42');
        await user.type(screen.getByLabelText('Étage du bien'), '3');
        await user.type(screen.getByLabelText("Étages de l'immeuble"), '6');
        await user.click(screen.getByRole('radio', { name: 'Meublé' }));
        await user.click(screen.getByRole('button', { name: 'Sud' }));
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByRole('button', {
                name: 'Conditions de location',
                current: 'step',
            }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Loi Alur' }));
        await user.type(screen.getByLabelText('Loyer hors charges'), '1450');
        await user.type(screen.getByLabelText('Charges'), '120');
        await user.click(screen.getByRole('button', { name: 'Équipement 1' }));
        // Les équipements au-delà des douze premiers attendent « Voir plus ».
        expect(
            screen.queryByRole('button', { name: 'Équipement 13' }),
        ).toBeNull();
        await user.click(
            screen.getByRole('button', { name: 'Voir plus (+2)' }),
        );
        await user.click(screen.getByRole('button', { name: 'Équipement 13' }));
        await user.type(
            screen.getByLabelText('Note libre'),
            'Visites le samedi.',
        );
        await user.click(
            screen.getByRole('button', { name: 'Ajouter le lead' }),
        );

        expect(post).toHaveBeenCalledWith('/owners/leads');
        const transformer = transform.mock.calls.at(-1)?.[0] as (
            data: OwnerLeadForm,
        ) => ReturnType<typeof ownerLeadFormToPayload>;
        const payload = transformer(latest.data as OwnerLeadForm);
        expect(payload.first_name).toBe('Paul');
        expect(payload.phone).toBeNull();
        expect(payload.assigned_to).toBe(1);
        expect(payload.property).toMatchObject({
            address: '12 rue de Rivoli, Paris',
            property_type: 't2',
            property_status: 'available',
            bedrooms: 5,
            bathrooms: null,
            surface: 42,
            floor: 3,
            building_floors: 6,
            furnishing: 'furnished',
            orientations: ['south'],
            lease_types: ['alur'],
            rent_cents: 145_000,
            charges_cents: 12_000,
            deposit_cents: null,
            amenities: ['elevator', 'dryer'],
            note: 'Visites le samedi.',
        });
    });

    it('offers the owner closing guide next to the title', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });
        expect(within(panel).getByText('Le bien')).toBeInTheDocument();
        expect(within(panel).getByText('Mandat proposé')).toBeInTheDocument();
    });

    it('refuses to leave step 1 while the contact is incomplete', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByRole('button', {
                name: 'Coordonnées',
                current: 'step',
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Le prénom est obligatoire.')).toHaveLength(
            1,
        );
        expect(
            screen.getAllByText('Indiquez au moins un e-mail ou un téléphone.'),
        ).toHaveLength(2);
        expect(toastError).toHaveBeenCalledWith(
            'Étape incomplète',
            'Corrigez les champs signalés avant de continuer.',
        );
        expect(post).not.toHaveBeenCalled();
    });

    it('lets the property steps be skipped and saves from step 3', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));
        await user.click(screen.getByRole('button', { name: 'Passer' }));
        expect(
            screen.getByRole('button', {
                name: 'Conditions de location',
                current: 'step',
            }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Passer et enregistrer' }),
        );

        expect(post).toHaveBeenCalledWith('/owners/leads');
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/owners/leads',
        );
    });

    it('flags an invalid surface on its step and does not submit', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));
        await user.type(screen.getByLabelText('Surface'), '12.5');
        await user.click(screen.getByRole('button', { name: 'Continuer' }));

        expect(
            screen.getByText('La surface doit être un nombre entier de m².'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Détail du bien',
                current: 'step',
            }),
        ).toBeInTheDocument();
        expect(post).not.toHaveBeenCalled();
    });

    it('edits an existing owner lead with its property and puts to the update route', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} lead={makeOwnerLeadEditable()} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Modifier Paul Roux',
        );
        expect(screen.getByLabelText('Prénom')).toHaveValue('Paul');
        expect(screen.getByRole('radio', { name: 'Camille' })).toBeChecked();
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-0000000000e9',
        );

        await user.click(
            screen.getByRole('button', { name: /Détail du bien/ }),
        );
        expect(screen.getByLabelText('Adresse du bien')).toHaveValue(
            '12 rue de Rivoli, 75004 Paris',
        );
        expect(screen.getByRole('radio', { name: 'T2' })).toHaveAttribute(
            'data-state',
            'on',
        );
        expect(screen.getByLabelText('Surface')).toHaveValue(42);

        await user.click(
            screen.getByRole('button', { name: /Conditions de location/ }),
        );
        expect(screen.getByLabelText('Loyer hors charges')).toHaveValue(1450);
        expect(screen.getByLabelText('Charges')).toHaveValue(120);

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(put).toHaveBeenCalledWith(
            '/owners/leads/0199a9a0-0000-7000-8000-0000000000e9',
        );
        expect(post).not.toHaveBeenCalled();
    });

    it('validates everything on ⌘+Enter and jumps to the step in error', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        await fillContact(user);
        await user.click(screen.getByRole('button', { name: 'Continuer' }));
        await user.type(screen.getByLabelText('Étage du bien'), '120');
        await user.click(screen.getByRole('button', { name: 'Passer' }));

        await user.keyboard('{Meta>}{Enter}{/Meta}');

        expect(
            screen.getByRole('button', {
                name: 'Détail du bien',
                current: 'step',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "L'étage doit être un nombre entier entre -5 et 99.",
            ),
        ).toBeInTheDocument();
        expect(post).not.toHaveBeenCalled();
    });

    it('leaves with Escape', async () => {
        const user = userEvent.setup();
        render(<OwnerLeadCreate {...props} />);

        await user.keyboard('{Escape}');

        expect(visit).toHaveBeenCalledWith('/owners/leads');
    });
});
