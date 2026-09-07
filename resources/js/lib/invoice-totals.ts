import type { InvoiceForm, InvoiceLineForm, Offer } from '@/types';

export type InvoiceTotals = {
    lines: {
        description: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
    }[];
    subtotalCents: number;
    discountPercent: number;
    discountCents: number;
    netSubtotalCents: number;
    vatCents: number;
    totalCents: number;
    depositCents: number;
    dueCents: number;
};

/** « 12,50 » ou « 12.50 » → 1250 centimes. Invalide → 0. */
export function toCents(value: string | number): number {
    const parsed =
        typeof value === 'number' ? value : Number(value.replace(',', '.'));

    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function toNumber(value: string | number): number {
    const parsed =
        typeof value === 'number' ? value : Number(value.replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Mêmes règles que côté PHP (InvoiceData) : total ligne arrondi au centime,
 * remise arrondie sur le sous-total, TVA arrondie sur le net, acompte déduit.
 */
export function computeInvoiceTotals(
    items: InvoiceLineForm[],
    vatRate: string | number,
    offers: Offer[] = [],
    options: {
        discountPercent?: string | number;
        deposit?: string | number;
    } = {},
): InvoiceTotals {
    const lines = items.map((item) => {
        const quantity = toNumber(item.quantity);
        const unitPriceCents = toCents(item.unit_price);
        const offer =
            item.offer === null
                ? null
                : offers.find((candidate) => candidate.value === item.offer);

        return {
            description:
                item.offer === null
                    ? item.description.trim() || 'Ligne libre'
                    : (offer?.description ?? item.offer),
            quantity,
            unitPriceCents,
            totalCents: Math.round(quantity * unitPriceCents),
        };
    });
    const subtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
    const discountPercent = Math.min(
        100,
        Math.max(0, toNumber(options.discountPercent ?? 0)),
    );
    const discountCents = Math.round((subtotalCents * discountPercent) / 100);
    const netSubtotalCents = subtotalCents - discountCents;
    const vatCents = Math.round((netSubtotalCents * toNumber(vatRate)) / 100);
    const totalCents = netSubtotalCents + vatCents;
    const depositCents = Math.max(0, toCents(options.deposit ?? 0));

    return {
        lines,
        subtotalCents,
        discountPercent,
        discountCents,
        netSubtotalCents,
        vatCents,
        totalCents,
        depositCents,
        dueCents: Math.max(0, totalCents - depositCents),
    };
}

export type InvoiceFormErrors = Partial<Record<string, string>>;

/**
 * Validation locale avant envoi, mêmes clés que les erreurs Laravel.
 * Évite un aller-retour serveur pour les oublis évidents.
 */
export function validateInvoiceForm(form: InvoiceForm): InvoiceFormErrors {
    const errors: InvoiceFormErrors = {};

    if (form.client_name.trim() === '') {
        errors.client_name = 'Le nom du client est obligatoire.';
    }

    if (
        form.client_email.trim() !== '' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)
    ) {
        errors.client_email = "L'adresse e-mail n'est pas valide.";
    }

    if (form.issued_at === '') {
        errors.issued_at = "La date d'émission est obligatoire.";
    }

    if (form.due_at === '') {
        errors.due_at = "La date d'échéance est obligatoire.";
    } else if (form.issued_at !== '' && form.due_at < form.issued_at) {
        errors.due_at =
            "L'échéance doit être postérieure ou égale à la date d'émission.";
    }

    const discount = toNumber(form.discount_percent || 0);

    if (discount < 0 || discount > 100) {
        errors.discount_percent =
            'La remise doit être comprise entre 0 et 100 %.';
    }

    if (toCents(form.deposit || 0) < 0) {
        errors.deposit_cents = "L'acompte ne peut pas être négatif.";
    }

    if (form.items.length === 0) {
        errors.items = 'Ajoutez au moins une ligne.';
    }

    form.items.forEach((line, index) => {
        if (line.offer === null && line.description.trim() === '') {
            errors[`items.${index}.description`] = 'Indiquez un libellé.';
        }

        if (line.unit_price.trim() === '' || toCents(line.unit_price) <= 0) {
            errors[`items.${index}.unit_price_cents`] =
                'Indiquez un prix unitaire.';
        }

        if (line.quantity.trim() === '' || toNumber(line.quantity) < 0) {
            errors[`items.${index}.quantity`] = 'Indiquez une quantité.';
        }
    });

    const totals = computeInvoiceTotals(form.items, form.vat_rate, [], {
        discountPercent: form.discount_percent,
        deposit: form.deposit,
    });

    if (totals.depositCents > totals.totalCents) {
        errors.deposit_cents = "L'acompte dépasse le total de la facture.";
    }

    return errors;
}
