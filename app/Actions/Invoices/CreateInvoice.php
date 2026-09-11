<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Data\InvoiceData;
use App\Data\InvoiceLineData;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Crée une facture : numéro séquentiel par année, totaux calculés,
 * puis diffusion temps réel au staff.
 */
final class CreateInvoice
{
    public function handle(InvoiceData $data, ?User $creator = null): Invoice
    {
        $invoice = DB::transaction(function () use ($data, $creator): Invoice {
            $invoice = Invoice::create([
                'number' => self::nextNumber(),
                'client_name' => $data->clientName,
                'client_email' => $data->clientEmail,
                'client_street' => $data->clientStreet,
                'client_postal_code' => $data->clientPostalCode,
                'client_city' => $data->clientCity,
                'client_country' => $data->clientCountry,
                'client_address' => $data->clientAddress(),
                'items' => array_map(fn (InvoiceLineData $line): array => $line->toArray(), $data->lines),
                'vat_rate' => $data->vatRate,
                'discount_percent' => $data->discountPercent,
                'discount_cents' => $data->discountCents(),
                'subtotal_cents' => $data->subtotalCents(),
                'vat_cents' => $data->vatCents(),
                'amount_cents' => $data->totalCents(),
                'deposit_cents' => $data->depositCents,
                'currency' => $data->currency,
                'status' => $data->status,
                'issued_at' => $data->issuedAt,
                'due_at' => $data->dueAt,
                'notes' => $data->notes,
                'bank_name' => $data->bankName,
                'bank_iban' => $data->bankIban,
                'created_by' => $creator?->id,
                'lead_id' => $data->leadId,
            ]);

            // Première entrée de l'historique : la création.
            $invoice->statusChanges()->create([
                'from_status' => null,
                'to_status' => $invoice->status,
                'changed_by' => $creator?->id,
                'note' => 'Création',
                'created_at' => now(),
            ]);

            return $invoice;
        });

        event(new DashboardUpdated('invoices', ['id' => $invoice->id], "a créé la facture {$invoice->number}"));

        return $invoice;
    }

    /**
     * Prochain numéro : préfixe (RP-27) + séquence sur 3 chiffres minimum, ex. RP-27054.
     */
    public static function nextNumber(): string
    {
        $prefix = (string) config('company.invoice_prefix', 'RP-27');

        // Tri par longueur puis valeur : « RP-271000 » passe bien après « RP-27999 »
        // (un tri alphabétique seul renverrait « 999 » pour toujours). Verrou de ligne
        // le temps de la transaction pour deux créations simultanées.
        $last = Invoice::query()
            ->where('number', 'like', $prefix.'%')
            ->orderByRaw('LENGTH(number) DESC, number DESC')
            ->lockForUpdate()
            ->value('number');

        $sequence = $last === null ? 0 : (int) substr((string) $last, strlen($prefix));

        return sprintf('%s%03d', $prefix, $sequence + 1);
    }
}
