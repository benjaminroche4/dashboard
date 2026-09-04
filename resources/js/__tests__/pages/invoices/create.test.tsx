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
        usePage: () => ({
            props: { features: { addressAutocomplete: false } },
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
        { value: 2.6, label: '2,6 % · taux réduit' },
        { value: 0, label: '0 % · exonéré / export' },
    ],
    nextNumber: 'RP-27054',
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

        expect(screen.getByRole('radio', { name: /Accompagné/ })).toBeChecked();
        expect(screen.getByLabelText('Prix unitaire ligne 1')).toHaveValue(
            '2500',
        );

        await user.type(screen.getByLabelText('Nom / Prénom'), 'Acme SA');
        await user.clear(screen.getByLabelText('Quantité ligne 1'));
        await user.type(screen.getByLabelText('Quantité ligne 1'), '2');

        const preview = within(screen.getByLabelText('Aperçu de la facture'));
        expect(preview.getByText('RP-27054')).toBeInTheDocument();
        expect(preview.getByText('Acme SA')).toBeInTheDocument();
        expect(preview.getByText('Offre Accompagné')).toBeInTheDocument();
        // 2 × 2500 = 5000 ; TVA 8,1 % = 405 ; total 5405
        expect(preview.getByText(/5.405\.00/)).toBeInTheDocument();
        expect(
            document.querySelector('[data-test="line-total"]')?.textContent,
        ).toMatch(/5.000\.00/);
    });

    it('switching the offer fills in its default price', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        await user.click(screen.getByRole('radio', { name: /Confié/ }));

        expect(screen.getByLabelText('Prix unitaire ligne 1')).toHaveValue(
            '4500',
        );
        expect(
            within(screen.getByLabelText('Aperçu de la facture')).getByText(
                'Offre Confié',
            ),
        ).toBeInTheDocument();
    });

    it('offers the VAT rates in a dropdown with the Swiss rate preselected', () => {
        render(<InvoicesCreate {...props} />);

        expect(screen.getByRole('combobox', { name: 'TVA' })).toHaveTextContent(
            '8,1 % · taux normal',
        );
    });

    it('shows the dates in French through the date pickers', () => {
        render(<InvoicesCreate {...props} />);

        expect(
            screen.getByRole('textbox', { name: "Date d'émission" }),
        ).toHaveValue('4 septembre 2026');
        expect(screen.getByRole('textbox', { name: 'Échéance' })).toHaveValue(
            '4 octobre 2026',
        );
    });

    it('has a structured address with the country preselected', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        const country = screen.getByRole('combobox', { name: 'Pays' });
        expect(country).toHaveTextContent('Suisse');
        expect(country.querySelector('[data-country="CH"]')).toHaveClass(
            'fi-ch',
            'rounded-full',
        );

        await user.type(screen.getByLabelText('Adresse'), 'Rue du Rhône 1');
        await user.type(screen.getByLabelText('Code postal'), '1204');
        await user.type(screen.getByLabelText('Ville'), 'Genève');

        expect(
            within(screen.getByLabelText('Aperçu de la facture')).getByText(
                /Rue du Rhône 1\s+1204 Genève\s+Suisse/,
            ),
        ).toBeInTheDocument();
    });

    it('adds and removes lines', async () => {
        const user = userEvent.setup();
        render(<InvoicesCreate {...props} />);

        expect(
            screen.queryByRole('button', { name: 'Supprimer la ligne 1' }),
        ).toBeNull();

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

        await user.type(screen.getByLabelText('Nom / Prénom'), 'Acme SA');
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
