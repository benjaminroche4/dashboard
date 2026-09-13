<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Enums\Currency;
use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Ouverture d'un dossier client sans lead : l'essentiel du contact et du
 * projet. Tout le reste (arrondissements, garants, qualification) se complète
 * ensuite sur la fiche du dossier.
 */
class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Lead::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            // Un dossier sans moyen de joindre le client ne sert à rien.
            'email' => ['nullable', 'email', 'max:255', 'required_without:phone'],
            'phone' => ['nullable', 'string', 'max:40', 'required_without:email'],
            'company' => ['nullable', 'string', 'max:120'],
            'language' => ['nullable', Rule::enum(LeadLanguage::class)],
            'offer' => ['nullable', Rule::enum(Offer::class)],
            'budget_cents' => ['nullable', 'integer', 'min:0'],
            'currency' => ['nullable', Rule::enum(Currency::class)],
            'arrival_at' => ['nullable', 'date'],
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'message' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'first_name' => 'prénom',
            'last_name' => 'nom',
            'email' => 'e-mail',
            'phone' => 'téléphone',
            'company' => 'société',
            'language' => 'langue',
            'offer' => 'formule',
            'budget_cents' => 'budget',
            'currency' => 'devise',
            'arrival_at' => "date d'arrivée",
            'assigned_to' => 'suivi par',
            'message' => 'note',
        ];
    }
}
