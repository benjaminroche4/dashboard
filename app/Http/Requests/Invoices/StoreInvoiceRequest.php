<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoices;

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Enums\Offer;
use App\Models\Invoice;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Invoice::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'currency' => ['required', Rule::enum(Currency::class)],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'issued_at' => ['required', 'date'],
            'due_at' => ['required', 'date', 'after_or_equal:issued_at'],
            'status' => ['nullable', Rule::enum(InvoiceStatus::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.offer' => ['required', Rule::enum(Offer::class)],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price_cents' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'client_name' => 'nom du client',
            'client_email' => 'e-mail du client',
            'client_address' => 'adresse du client',
            'currency' => 'devise',
            'vat_rate' => 'taux de TVA',
            'issued_at' => "date d'émission",
            'due_at' => "date d'échéance",
            'items' => 'lignes',
            'items.*.offer' => 'offre',
            'items.*.quantity' => 'quantité',
            'items.*.unit_price_cents' => 'prix unitaire',
        ];
    }
}
