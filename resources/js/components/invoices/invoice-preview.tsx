import { formatLongDate, formatMoney } from '@/lib/format';
import { computeInvoiceTotals } from '@/lib/invoice-totals';
import type { Company, InvoiceForm, Offer } from '@/types';

/**
 * Aperçu de la facture, mis à jour en direct depuis le formulaire.
 * Sert aussi de rendu sur la page de détail (voir invoiceToForm).
 */
export function InvoicePreview({
    form,
    company,
    offers,
    number = 'Aperçu',
}: {
    form: InvoiceForm;
    company: Company;
    offers: Offer[];
    number?: string;
}) {
    const totals = computeInvoiceTotals(form.items, form.vat_rate, offers, {
        discountPercent: form.discount_percent,
        deposit: form.deposit,
    });
    const addressLines = [
        form.client_street,
        [form.client_postal_code, form.client_city].filter(Boolean).join(' '),
        form.client_country,
    ].filter((line) => line.trim() !== '');
    const money = (cents: number) => formatMoney(cents, form.currency);

    return (
        <article
            aria-label="Aperçu de la facture"
            className="bg-background text-foreground flex aspect-[1/1.3] w-full flex-col gap-8 overflow-hidden rounded-lg border p-8 text-sm"
        >
            <header className="flex items-start justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <img
                            src="/images/logo.jpg"
                            alt=""
                            className="size-6 rounded-sm"
                        />
                        <p className="text-base font-semibold">
                            {company.name}
                        </p>
                    </div>
                    <p className="text-muted-foreground">
                        {company.email}
                        <br />
                        {company.phone}
                    </p>
                    <p className="text-muted-foreground border-t pt-2 whitespace-pre-line">
                        {company.address}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold tracking-tight">
                        Facture
                    </p>
                    <p
                        className="text-muted-foreground tabular-nums"
                        data-test="preview-number"
                    >
                        {number}
                    </p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <p className="text-muted-foreground text-xs font-medium uppercase">
                        Facturé à
                    </p>
                    <p className="font-medium">
                        {form.client_name || 'Nom du client'}
                    </p>
                    {addressLines.length > 0 && (
                        <p className="text-muted-foreground whitespace-pre-line">
                            {addressLines.join('\n')}
                        </p>
                    )}
                    {form.client_email && (
                        <p className="text-muted-foreground">
                            {form.client_email}
                        </p>
                    )}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 self-start text-right">
                    <dt className="text-muted-foreground">Date d'émission</dt>
                    <dd>{formatLongDate(form.issued_at) || '—'}</dd>
                    <dt className="text-muted-foreground">Échéance</dt>
                    <dd>{formatLongDate(form.due_at) || '—'}</dd>
                    <dt className="text-muted-foreground">Devise</dt>
                    <dd>{form.currency}</dd>
                </dl>
            </section>

            <table className="w-full">
                <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                        <th className="py-2 font-medium">Description</th>
                        <th className="py-2 text-right font-medium">Qté</th>
                        <th className="py-2 text-right font-medium">
                            Prix unitaire
                        </th>
                        <th className="py-2 text-right font-medium">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {totals.lines.map((line, index) => (
                        <tr key={index}>
                            <td className="py-2 pr-4">{line.description}</td>
                            <td className="py-2 text-right tabular-nums">
                                {line.quantity}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                                {money(line.unitPriceCents)}
                            </td>
                            <td className="py-2 text-right tabular-nums">
                                {money(line.totalCents)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <dl className="ml-auto grid w-64 grid-cols-[1fr_auto] gap-y-1 tabular-nums">
                <dt className="text-muted-foreground">Sous-total</dt>
                <dd className="text-right" data-test="preview-subtotal">
                    {money(totals.subtotalCents)}
                </dd>
                {totals.discountCents > 0 && (
                    <>
                        <dt className="text-muted-foreground">
                            Remise {totals.discountPercent} %
                        </dt>
                        <dd className="text-right" data-test="preview-discount">
                            − {money(totals.discountCents)}
                        </dd>
                    </>
                )}
                <dt className="text-muted-foreground">
                    TVA {form.vat_rate || 0} %
                </dt>
                <dd className="text-right" data-test="preview-vat">
                    {money(totals.vatCents)}
                </dd>
                <dt className="border-t pt-2 font-semibold">Total</dt>
                <dd
                    className="border-t pt-2 text-right font-semibold"
                    data-test="preview-total"
                >
                    {money(totals.totalCents)}
                </dd>
                {totals.depositCents > 0 && (
                    <>
                        <dt className="text-muted-foreground">Acompte versé</dt>
                        <dd className="text-right" data-test="preview-deposit">
                            − {money(totals.depositCents)}
                        </dd>
                        <dt className="border-t pt-2 font-semibold">
                            Reste à payer
                        </dt>
                        <dd
                            className="border-t pt-2 text-right font-semibold"
                            data-test="preview-due"
                        >
                            {money(totals.dueCents)}
                        </dd>
                    </>
                )}
            </dl>

            <footer className="text-muted-foreground mt-auto space-y-2 border-t pt-4 text-xs">
                {form.notes && (
                    <p className="text-foreground whitespace-pre-line">
                        {form.notes}
                    </p>
                )}
                <p>
                    Paiement par virement sur {company.bank}, IBAN{' '}
                    {company.iban}, en {form.currency}.
                </p>
            </footer>
        </article>
    );
}
