import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, transform, toastError } = vi.hoisted(() => ({
    post: vi.fn(),
    transform: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { error: toastError } }));

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>();

    return {
        ...actual,
        Head: () => null,
        usePage: () => ({
            props: {
                features: { addressAutocomplete: false, googleMapsKey: null },
            },
        }),
        Link: ({ href, children }: { href: unknown; children: ReactNode }) => (
            <a
                href={
                    typeof href === 'string'
                        ? href
                        : (href as { url: string }).url
                }
            >
                {children}
            </a>
        ),
        useForm: (initial: Record<string, unknown>) => useFormStub(initial),
    };
});

// Stub minimal d'Inertia useForm : setData(clé, valeur) ou setData(objet).
function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {},
        processing: false,
        setData: (
            keyOrData: string | Record<string, unknown>,
            value?: unknown,
        ) =>
            setDataState((current) =>
                typeof keyOrData === 'string'
                    ? { ...current, [keyOrData]: value }
                    : { ...current, ...keyOrData },
            ),
        transform,
        post,
    };
}

import QuotesCreate from '@/pages/quotes/create';

const props = {
    company: {
        name: 'Relocation In Paris',
        address: 'Rue des Alpes 5',
        email: 'contact@relocation-in-paris.com',
        phone: '+33',
        vat_number: 'CHE',
        iban: 'CH00',
        bank: 'Banque',
        default_vat_rate: 8.1,
        default_currency: 'CHF' as const,
        default_payment_terms_days: 30,
    },
    offers: [
        {
            value: 'accompagne' as const,
            label: 'Accompagné',
            description: 'Offre Accompagné',
            prices: { CHF: 250_000, EUR: 260_000 },
        },
        {
            value: 'confie' as const,
            label: 'Confié',
            description: 'Offre Confié',
            prices: { CHF: 450_000, EUR: 470_000 },
        },
    ],
    currencies: [
        { value: 'CHF' as const, label: 'Franc suisse (CHF)' },
        { value: 'EUR' as const, label: 'Euro (EUR)' },
    ],
    countries: [
        { code: 'CH', name: 'Suisse' },
        { code: 'FR', name: 'France' },
        { code: null, name: 'Autre' },
    ],
    vatRates: [
        { value: 8.1, label: '8,1 % · taux normal' },
        { value: 0, label: '0 % · exonéré / export' },
    ],
    nextNumber: 'DV-27054',
    prefill: null,
    defaults: {
        currency: 'CHF' as const,
        vat_rate: 8.1,
        issued_at: '2026-09-07',
        valid_until: '2026-10-07',
    },
};

describe('Quote creation page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('prefills the first offer and updates the quote preview as the form is filled', async () => {
        const user = userEvent.setup();
        render(<QuotesCreate {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Nouveau devis',
        );
        expect(screen.getByRole('radio', { name: /Accompagné/ })).toBeChecked();
        expect(screen.getByLabelText('Prix unitaire ligne 1')).toHaveValue(
            '2500',
        );
        expect(
            screen.getByRole('textbox', { name: "Valable jusqu'au" }),
        ).toHaveValue('7 octobre 2026');
        expect(screen.queryByLabelText(/Acompte/)).toBeNull();

        await user.type(screen.getByLabelText('Nom / Prénom'), 'Acme SA');
        await user.clear(screen.getByLabelText('Quantité ligne 1'));
        await user.type(screen.getByLabelText('Quantité ligne 1'), '2');

        const preview = within(screen.getByLabelText('Aperçu du devis'));
        expect(preview.getByText('Devis')).toBeInTheDocument();
        expect(preview.getByText('DV-27054')).toBeInTheDocument();
        expect(preview.getByText('Acme SA')).toBeInTheDocument();
        expect(preview.getByText("Valable jusqu'au")).toBeInTheDocument();
        // 2 × 2500 = 5000 ; TVA 8,1 % = 405 ; total 5405
        expect(preview.getByText(/5.405\.00/)).toBeInTheDocument();
    });

    it('shows the lead when prefilled from a lead page', () => {
        render(
            <QuotesCreate
                {...props}
                prefill={{
                    lead_id: 4,
                    lead_uuid: 'abc',
                    lead_name: 'Léa Durand',
                    client_name: 'Nestlé',
                    client_email: 'lea@example.com',
                    currency: 'EUR',
                    offer: 'confie',
                }}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/locataires/abc');
        expect(screen.getByLabelText('Nom / Prénom')).toHaveValue('Nestlé');
        expect(screen.getByRole('radio', { name: /Confié/ })).toBeChecked();
        expect(screen.getByLabelText('Prix unitaire ligne 1')).toHaveValue(
            '4700',
        );
    });

    it('submits offers, cents, the validity and the lead to the store route', async () => {
        const user = userEvent.setup();
        render(<QuotesCreate {...props} />);

        await user.type(screen.getByLabelText('Nom / Prénom'), 'Acme SA');
        await user.click(
            screen.getByRole('button', { name: 'Créer le devis' }),
        );

        expect(transform).toHaveBeenCalled();
        const transformer = transform.mock.calls.at(-1)?.[0] as (
            d: unknown,
        ) => Record<string, unknown>;
        const payload = transformer({
            client_name: 'Acme SA',
            vat_rate: '8.1',
            discount_percent: '',
            valid_until: '2026-10-07',
            items: [
                {
                    offer: 'confie',
                    description: '',
                    quantity: '1,5',
                    unit_price: '99,99',
                },
            ],
        });

        expect(payload.lead_id).toBeNull();
        expect(payload.vat_rate).toBe(8.1);
        expect(payload.valid_until).toBe('2026-10-07');
        expect(payload.items).toEqual([
            {
                offer: 'confie',
                description: null,
                quantity: 1.5,
                unit_price_cents: 9999,
            },
        ]);
        expect(post).toHaveBeenCalledWith('/tools/quotes');
    });

    it('blocks submission and shows errors when the form is incomplete', async () => {
        const user = userEvent.setup();
        render(<QuotesCreate {...props} />);

        await user.type(screen.getByLabelText('Nom / Prénom'), 'Acme SA');
        await user.type(screen.getByLabelText('Remise (%)'), '150');
        await user.click(
            screen.getByRole('button', { name: 'Créer le devis' }),
        );

        expect(post).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalledWith(
            'Formulaire incomplet',
            'Corrigez les champs signalés avant de créer le devis.',
        );
        expect(
            screen.getByText('La remise doit être comprise entre 0 et 100 %.'),
        ).toBeInTheDocument();
    });

    it('declares breadcrumbs under the tools page', () => {
        expect(
            QuotesCreate.layout.breadcrumbs.map((crumb) => crumb.title),
        ).toEqual(['Outils', 'Devis', 'Nouveau devis']);
    });
});
