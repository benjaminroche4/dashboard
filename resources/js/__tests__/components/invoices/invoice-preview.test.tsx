import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import type { Company, InvoiceForm, Offer } from '@/types';

const company: Company = {
    name: 'Relocation In Paris',
    address: 'Rue des Alpes 5\n1201 Genève',
    email: 'contact@relocation-in-paris.com',
    phone: '+33 1 84 80 43 44',
    vat_number: 'CHE-000.000.000 TVA',
    iban: 'CH00 0000 0000 0000 0000 0',
    bank: 'Banque Exemple SA',
    default_vat_rate: 8.1,
    default_currency: 'CHF',
    default_payment_terms_days: 30,
};

const offers: Offer[] = [
    {
        value: 'accompagne',
        label: 'Accompagné',
        description: 'Offre Accompagné',
        prices: { CHF: 250_000, EUR: 260_000 },
    },
    {
        value: 'confie',
        label: 'Confié',
        description: 'Offre Confié',
        prices: { CHF: 450_000, EUR: 470_000 },
    },
];

const form: InvoiceForm = {
    client_name: 'Acme SA',
    client_email: 'compta@acme.ch',
    client_street: 'Rue du Rhône 1',
    client_postal_code: '1204',
    client_city: 'Genève',
    client_country: 'Suisse',
    currency: 'CHF',
    vat_rate: '8.1',
    discount_percent: '',
    deposit: '',
    issued_at: '2026-09-04',
    due_at: '2026-10-04',
    notes: 'Merci.',
    bank_name: '',
    bank_iban: '',
    items: [
        {
            offer: 'accompagne',
            description: '',
            quantity: '2',
            unit_price: '150',
        },
    ],
};

function text(container: HTMLElement, test: string) {
    return container.querySelector(`[data-test="${test}"]`)?.textContent ?? '';
}

describe('InvoicePreview', () => {
    it('renders company, client, offer, dates and Swiss francs totals', () => {
        const { container } = render(
            <InvoicePreview form={form} company={company} offers={offers} />,
        );

        expect(screen.getByText('Relocation In Paris')).toBeInTheDocument();
        expect(container.querySelector('header img')).toHaveAttribute(
            'src',
            '/images/logo.jpg',
        );
        expect(screen.getByText(/Rue des Alpes 5/)).toHaveClass('border-t');
        expect(screen.getByText('Acme SA')).toBeInTheDocument();
        expect(
            screen.getByText(/Rue du Rhône 1\s+1204 Genève\s+Suisse/),
        ).toBeInTheDocument();
        expect(screen.getByText('Offre Accompagné')).toBeInTheDocument();
        expect(screen.getByText('4 septembre 2026')).toBeInTheDocument();
        expect(screen.getByText('4 octobre 2026')).toBeInTheDocument();
        expect(text(container, 'preview-subtotal')).toMatch(/300\.00/);
        expect(text(container, 'preview-vat')).toMatch(/24\.30/);
        expect(text(container, 'preview-total')).toMatch(/324\.30/);
        expect(screen.getByText(/IBAN CH00/)).toBeInTheDocument();
        expect(screen.getByText('Merci.')).toBeInTheDocument();
    });

    it('switches to euro formatting', () => {
        const { container } = render(
            <InvoicePreview
                form={{ ...form, currency: 'EUR', vat_rate: '0' }}
                company={company}
                offers={offers}
            />,
        );

        expect(text(container, 'preview-total')).toMatch(/300,00.€/);
        expect(text(container, 'preview-vat')).toMatch(/0,00/);
    });

    it('shows placeholders when the form is empty', () => {
        render(
            <InvoicePreview
                form={{
                    ...form,
                    client_name: '',
                    issued_at: '',
                    items: [
                        {
                            offer: 'confie',
                            description: '',
                            quantity: '1',
                            unit_price: '',
                        },
                    ],
                }}
                company={company}
                offers={offers}
            />,
        );

        expect(screen.getByText('Nom du client')).toBeInTheDocument();
        expect(screen.getByText('Offre Confié')).toBeInTheDocument();
        expect(screen.getByText('Aperçu')).toBeInTheDocument();
    });

    it('renders as a quote with its own wording when kind is "quote"', () => {
        render(
            <InvoicePreview
                form={form}
                company={company}
                offers={offers}
                number="DV-27001"
                kind="quote"
            />,
        );

        const preview = within(screen.getByLabelText('Aperçu du devis'));
        expect(preview.getByText('Devis')).toBeInTheDocument();
        expect(preview.getByText('Adressé à')).toBeInTheDocument();
        expect(preview.getByText("Valable jusqu'au")).toBeInTheDocument();
        expect(preview.getByText(/Bon pour accord/)).toBeInTheDocument();
        expect(preview.getByText(/Règlement par virement/)).toBeInTheDocument();
        expect(screen.queryByText('Facturé à')).toBeNull();
    });
});
