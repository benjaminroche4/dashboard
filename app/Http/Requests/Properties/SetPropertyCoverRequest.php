<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Models\Property;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SetPropertyCoverRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $property = $this->route('property');
        $count = $property instanceof Property ? count($property->photos ?? []) : 0;

        return [
            // Rang de la photo dans celles du bien : rien d'autre n'est accepté.
            'index' => ['required', 'integer', 'min:0', 'max:'.max($count - 1, 0)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['index' => 'photo'];
    }
}
