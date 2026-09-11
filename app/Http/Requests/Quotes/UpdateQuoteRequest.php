<?php

declare(strict_types=1);

namespace App\Http\Requests\Quotes;

use App\Models\Quote;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Modification d'un devis : mêmes règles que la création. Le statut ne se change
 * pas ici, et seul un devis encore en jeu est modifiable (voir UpdateQuote).
 */
class UpdateQuoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        $quote = $this->route('quote');

        return $quote instanceof Quote && ($this->user()?->can('update', $quote) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return StoreQuoteRequest::quoteRules();
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return StoreQuoteRequest::quoteAttributes();
    }
}
