<?php

declare(strict_types=1);

namespace App\Http\Requests\Quotes;

use App\Enums\Currency;
use App\Enums\Offer;
use App\Models\Quote;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Quote::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return self::quoteRules();
    }

    /**
     * Règles d'un devis, partagées avec la modification.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public static function quoteRules(): array
    {
        return [
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'partner_id' => ['nullable', 'integer', 'exists:partners,id'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_street' => ['nullable', 'string', 'max:255'],
            'client_postal_code' => ['nullable', 'string', 'max:32'],
            'client_city' => ['nullable', 'string', 'max:255'],
            'client_country' => ['nullable', 'string', 'max:64'],
            'currency' => ['required', Rule::enum(Currency::class)],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'issued_at' => ['required', 'date'],
            'valid_until' => ['required', 'date', 'after_or_equal:issued_at'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Compte d'encaissement : laissé vide, le compte par défaut de la devise s'applique.
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_iban' => ['nullable', 'string', 'max:60'],
            'bank_reference' => ['nullable', 'string', 'max:120'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.offer' => ['nullable', 'required_without:items.*.description', Rule::enum(Offer::class)],
            'items.*.description' => ['nullable', 'required_without:items.*.offer', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0', 'max:10000'],
            'items.*.unit_price_cents' => ['required', 'integer', 'min:0', 'max:100000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return self::quoteAttributes();
    }

    /**
     * @return array<string, string>
     */
    public static function quoteAttributes(): array
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
            'issued_at' => "date d'émission",
            'valid_until' => 'date de validité',
            'items' => 'lignes',
            'items.*.offer' => 'offre',
            'items.*.description' => 'libellé',
            'items.*.quantity' => 'quantité',
            'items.*.unit_price_cents' => 'prix unitaire',
        ];
    }
}
