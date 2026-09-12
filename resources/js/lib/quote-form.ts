import { toCents, toNumber, validateInvoiceForm } from '@/lib/invoice-totals';
import type { InvoiceForm, QuoteDetail, QuoteForm } from '@/types';

/**
 * Vue « facture » d'un formulaire de devis, pour partager l'aperçu et les
 * totaux : la validité tient lieu d'échéance, sans acompte.
 */
export function quoteFormToInvoiceForm(form: QuoteForm): InvoiceForm {
    return {
        client_name: form.client_name,
        client_email: form.client_email,
        client_street: form.client_street,
        client_postal_code: form.client_postal_code,
        client_city: form.client_city,
        client_country: form.client_country,
        currency: form.currency,
        vat_rate: form.vat_rate,
        discount_percent: form.discount_percent,
        deposit: '',
        issued_at: form.issued_at,
        due_at: form.valid_until,
        notes: form.notes,
        bank_name: form.bank_name,
        bank_iban: form.bank_iban,
        bank_reference: form.bank_reference,
        items: form.items,
    };
}

/** Convertit un devis enregistré en données de formulaire, pour réutiliser l'aperçu. */
export function quoteToForm(quote: QuoteDetail): QuoteForm {
    return {
        client_name: quote.client_name,
        client_email: quote.client_email ?? '',
        client_street: quote.client_street ?? '',
        client_postal_code: quote.client_postal_code ?? '',
        client_city: quote.client_city ?? '',
        client_country: quote.client_country ?? '',
        currency: quote.currency,
        vat_rate: String(quote.vat_rate),
        discount_percent: String(quote.discount_percent),
        issued_at: quote.issued_at,
        valid_until: quote.valid_until,
        notes: quote.notes ?? '',
        bank_name: quote.bank_name ?? '',
        bank_iban: quote.bank_iban ?? '',
        bank_reference: quote.bank_reference ?? '',
        items: quote.items.map((line) => ({
            offer: line.offer,
            description: line.offer === null ? line.description : '',
            quantity: String(line.quantity),
            unit_price: String(line.unit_price_cents / 100),
        })),
    };
}

export type QuoteFormErrors = Partial<Record<string, string>>;

/**
 * Validation locale avant envoi, mêmes clés que les erreurs Laravel
 * (StoreQuoteRequest). Réutilise les règles de la facture, en renommant
 * l'échéance en validité.
 */
export function validateQuoteForm(form: QuoteForm): QuoteFormErrors {
    const { due_at, deposit_cents, ...rest } = validateInvoiceForm(
        quoteFormToInvoiceForm(form),
    );
    void deposit_cents;
    const errors: QuoteFormErrors = { ...rest };

    if (form.valid_until === '') {
        errors.valid_until = 'La date de validité est obligatoire.';
    } else if (due_at !== undefined) {
        errors.valid_until =
            "La validité doit être postérieure ou égale à la date d'émission.";
    }

    return errors;
}

/** Charge utile attendue par le backend : centimes et nombres. */
export function quoteFormToPayload(
    form: QuoteForm,
    /** Rattachement du devis : un lead, un partenaire, ou rien. */
    links: { lead_id: number | null; partner_id: number | null },
) {
    return {
        ...form,
        ...links,
        vat_rate: toNumber(form.vat_rate),
        discount_percent: toNumber(form.discount_percent || 0),
        items: form.items.map((line) => ({
            offer: line.offer,
            description: line.offer === null ? line.description.trim() : null,
            quantity: toNumber(line.quantity),
            unit_price_cents: toCents(line.unit_price),
        })),
    };
}
