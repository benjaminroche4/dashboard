<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoices;

use App\Models\Invoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Modification d'une facture : mêmes règles que la création, tenues à un seul
 * endroit. Le statut ne se change pas ici (envoi, paiement et annulation ont
 * leurs propres routes) et seul un brouillon est modifiable (voir UpdateInvoice).
 */
class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $invoice = $this->route('invoice');

        return $invoice instanceof Invoice && ($this->user()?->can('update', $invoice) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return StoreInvoiceRequest::invoiceRules();
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return StoreInvoiceRequest::depositCheck();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return StoreInvoiceRequest::invoiceAttributes();
    }
}
