<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoices;

use Illuminate\Contracts\Validation\ValidationRule;

class BulkPayInvoicesRequest extends BulkSendInvoicesRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [...parent::attributes(), 'paid_at' => 'date de paiement'];
    }
}
