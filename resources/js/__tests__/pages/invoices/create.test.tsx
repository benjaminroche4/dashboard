import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post, transform } = vi.hoisted(() => ({
    post: vi.fn(),
    transform: vi.fn(),
}));

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>();

    return {
        ...actual,
        Head: () => null,
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

import InvoicesCreate from '@/pages/invoices/create';

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
            description: 'Relocation Paris · Offre Accompagné',
            prices: { CHF: 250_000, EUR: 260_000 },
        },
        {
            value: 'confie' as const,
            label: 'Confié',
            description: 'Relocation Paris · Offre Confié',
            prices: { CHF: 450_000, EUR: 470_000 },
        },
    ],
    currencies: [
        { value: 'CHF' as const, label: 'Franc suisse (CHF)' },
        { value: 'EUR' as const, label: 'Euro (EUR)' },
    ],
    defaults: {
        currency: 'CHF' as const,
        vat_rate: 8.1,
        issued_at: '2026-09-04',
        due_at: '2026-10-04',
    },
};

describe('Invoice creation page', () => {
    it('prefills the first offer and updates the preview as the form is filled', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        expect(screen.getByRole('radio', { name: 'Accompagné' })).toBeChecked();
        expect(screen.getByLabelText('Prix unitaire ligne 1')).toHaveValue(
            '2500',
        );

        await user.type(screen.getByLabelText('Nom'), 'Acme SA');
        await user.clear(screen.getByLabelText('Quantité ligne 1'));
        await user.type(screen.getByLabelText('Quantité ligne 1'), '2');

        const preview = within(screen.getByLabelText('Aperçu de la facture'));
        expect(preview.getByText('Acme SA')).toBeInTheDocument();
        expect(
            preview.getByText('Relocation Paris · Offre Accompagné'),
        ).toBeInTheDocument();
        // 2 × 2500 = 5000 ; TVA 8,1 % = 405 ; total 5405
        expect(preview.getByText(/5.405\.00/)).toBeInTheDocument();
    });

    it('switching the offer fills in its default price', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        await user.click(screen.getByRole('radio', { name: 'Confié' }));

        expect(screen.getByLabelText('Prix unitaire ligne 1')).toHaveValue(
            '4500',
        );
        expect(
            within(screen.getByLabelText('Aperçu de la facture')).getByText(
                'Relocation Paris · Offre Confié',
            ),
        ).toBeInTheDocument();
    });

    it('adds and removes lines', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        expect(
            screen.getByRole('button', { name: 'Supprimer la ligne 1' }),
        ).toBeDisabled();

        await user.click(
            screen.getByRole('button', { name: 'Ajouter une ligne' }),
        );
        expect(screen.getAllByLabelText(/Quantité ligne/)).toHaveLength(2);

        await user.click(
            screen.getByRole('button', { name: 'Supprimer la ligne 2' }),
        );
        expect(screen.getAllByLabelText(/Quantité ligne/)).toHaveLength(1);
    });

    it('submits offers, cents and numbers to the store route', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        await user.type(screen.getByLabelText('Nom'), 'Acme SA');
        await user.click(
            screen.getByRole('button', { name: 'Créer la facture' }),
        );

        expect(transform).toHaveBeenCalled();
        const transformer = transform.mock.calls.at(-1)?.[0] as (
            d: unknown,
        ) => Record<string, unknown>;
        const payload = transformer({
            client_name: 'Acme SA',
            vat_rate: '8.1',
            items: [{ offer: 'confie', quantity: '1,5', unit_price: '99,99' }],
        });

        expect(payload.vat_rate).toBe(8.1);
        expect(payload.items).toEqual([
            { offer: 'confie', quantity: 1.5, unit_price_cents: 9999 },
        ]);
        expect(post).toHaveBeenCalledWith('/invoices');
    });
});
