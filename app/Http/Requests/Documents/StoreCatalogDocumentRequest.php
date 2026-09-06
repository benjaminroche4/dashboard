<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Enums\DocumentCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCatalogDocumentRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category' => ['required', Rule::enum(DocumentCategory::class)],
            'label' => ['required', 'string', 'max:255'],
            'label_en' => ['nullable', 'string', 'max:255'],
            'hint' => ['nullable', 'string', 'max:500'],
            'hint_en' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'category' => 'catégorie',
            'label' => 'libellé',
            'label_en' => 'libellé anglais',
            'hint' => 'aide',
            'hint_en' => 'aide anglaise',
        ];
    }
}
