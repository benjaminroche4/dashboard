<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Models\Property;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ExtractListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Property::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['input' => ['required', 'string', 'min:10', 'max:60000']];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['input' => 'annonce'];
    }
}
