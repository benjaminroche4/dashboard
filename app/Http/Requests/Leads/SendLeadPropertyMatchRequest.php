<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SendLeadPropertyMatchRequest extends FormRequest
{
    /** Au-delà, le chiffre ne fait plus envie, il fait douter. */
    public const int MAX_COUNT = 50;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'count' => ['required', 'integer', 'min:1', 'max:'.self::MAX_COUNT],
        ];
    }

    public function count(): int
    {
        return (int) $this->validated('count');
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['count' => 'nombre de biens'];
    }
}
