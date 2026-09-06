<?php

declare(strict_types=1);

namespace App\Http\Requests\Webhooks;

use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\WebsiteHelpType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Payload du formulaire de contact du site (l'authentification est faite par
 * le middleware de signature, pas par un utilisateur).
 */
class StoreWebsiteContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reference' => ['required', 'string', 'max:20'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:40', 'required_without:email'],
            'company' => ['nullable', 'string', 'max:150'],
            'help_type' => ['required', Rule::enum(WebsiteHelpType::class)],
            'offer' => ['nullable', Rule::enum(Offer::class)],
            'message' => ['nullable', 'string', 'max:5000'],
            'lang' => ['nullable', Rule::enum(LeadLanguage::class)],
            'created_at' => ['nullable', 'date'],
        ];
    }
}
