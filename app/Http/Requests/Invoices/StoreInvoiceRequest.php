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
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_street' => ['nullable', 'string', 'max:255'],
            'client_postal_code' => ['nullable', 'string', 'max:32'],
            'client_city' => ['nullable', 'string', 'max:255'],
            'client_country' => ['nullable', 'string', 'max:64'],
            'currency' => ['required', Rule::enum(Currency::class)],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'deposit_cents' => ['nullable', 'integer', 'min:0'],
            'issued_at' => ['required', 'date'],
            'due_at' => ['required', 'date', 'after_or_equal:issued_at'],
            'status' => ['nullable', Rule::enum(InvoiceStatus::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.offer' => ['required', Rule::enum(Offer::class)],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
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
            'client_street' => 'adresse',
            'client_postal_code' => 'code postal',
            'client_city' => 'ville',
            'client_country' => 'pays',
            'currency' => 'devise',
            'vat_rate' => 'taux de TVA',
            'discount_percent' => 'remise',
            'deposit_cents' => 'acompte',
            'issued_at' => "date d'émission",
            'due_at' => "date d'échéance",
            'items' => 'lignes',
            'items.*.offer' => 'offre',
            'items.*.quantity' => 'quantité',
            'items.*.unit_price_cents' => 'prix unitaire',
        ];
    }
}
