<?php

declare(strict_types=1);

namespace App\Http\Requests\Quotes;

use App\Models\Quote;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Devis cochés dans la liste, pour un envoi ou une acceptation groupés.
 */
class BulkQuotesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', Quote::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:quotes,id'],
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        /** @var list<int|string> $ids */
        $ids = $this->validated('ids');

        return array_map(intval(...), $ids);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['ids' => 'devis', 'ids.*' => 'devis'];
    }
}
