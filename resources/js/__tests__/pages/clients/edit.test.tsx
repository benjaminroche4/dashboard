import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));

let transform: (data: Record<string, unknown>) => unknown = (data) => data;

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: 'Admin', role: 'admin' } },
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, unknown>) => {
        const [data, setDataState] = useState(initial);

        return {
            data,
            errors: {} as Record<string, string | undefined>,
            processing: false,
            setData: (
                key: string | ((data: Record<string, unknown>) => unknown),
                value?: unknown,
            ) =>
                setDataState((current) =>
                    typeof key === 'function'
                        ? (key(current) as Record<string, unknown>)
                        : { ...current, [key]: value },
                ),
            transform: (fn: (data: Record<string, unknown>) => unknown) => {
                transform = fn;
            },
            patch: (url: string) => patch(url, transform(data)),
        };
    },
}));

import ClientEdit from '@/pages/clients/edit';

const props = {
    client: {
        uuid: 'client-1',
        name: 'Bruno & Charles',
        reference: 'LD-4821',
        first_name: 'Bruno',
        last_name: 'Mata',
        email: 'bruno@example.com',
        phone: '',
        company: '',
        language: 'fr',
        offer: 'accompagne',
        budget: '2500',
        currency: 'EUR',
        arrival_at: '2026-11-01',
        districts: [11],
        property_types: [],
        duration: '',
        guarantors: [],
        furnished: '',
        origin_city: '',
        message: '',
    },
    offers: [
        { value: 'accompagne', label: 'Accompagné', price_cents: 150000 },
        { value: 'confie', label: 'Confié', price_cents: 300000 },
    ],
    languages: [
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'Anglais' },
    ],
    propertyTypes: [
        { value: 't1', label: 'T1' },
        { value: 't2', label: 'T2' },
    ],
    durations: [{ value: 'medium', label: '6 à 12 mois' }],
    guarantors: [{ value: 'parents', label: 'Parents' }],
    furnishedOptions: [{ value: 'furnished', label: 'Meublé' }],
    currencies: [
        { value: 'EUR', label: 'Euro' },
        { value: 'CHF', label: 'Franc suisse' },
    ],
} as unknown as React.ComponentProps<typeof ClientEdit>;

describe('page de modification d’un dossier client', () => {
    it('reprend les valeurs du dossier et renvoie sur sa propre route', async () => {
        const user = userEvent.setup();
        render(<ClientEdit {...props} />);

        expect(
            screen.getByRole('heading', {
                name: /Modifier le dossier Bruno & Charles/,
            }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Prénom')).toHaveValue('Bruno');
        expect(screen.getByLabelText('Budget mensuel')).toHaveValue('2500');

        await user.click(
            screen.getByRole('button', {
                name: 'Enregistrer les modifications',
            }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/clients/client-1',
            // Le budget part en centimes, les champs vides en null.
            expect.objectContaining({
                first_name: 'Bruno',
                budget_cents: 250000,
                duration: null,
                furnished: null,
                districts: [11],
            }),
        );
    });

    it('propose de revenir au dossier sans enregistrer', () => {
        render(<ClientEdit {...props} />);

        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/clients/client-1',
        );
    });
});
