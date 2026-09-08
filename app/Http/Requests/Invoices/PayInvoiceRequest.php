<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoices;

use App\Models\Invoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PayInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Invoice|null $invoice */
        $invoice = $this->route('invoice');

        return $invoice !== null && ($this->user()?->can('update', $invoice) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // « Aujourd'hui » au sens de Paris, pas d'UTC (entre minuit et 2 h, la date locale est déjà passée en UTC).
            'paid_at' => ['required', 'date', 'before_or_equal:'.now('Europe/Paris')->toDateString()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['paid_at' => 'date de paiement'];
    }
}
