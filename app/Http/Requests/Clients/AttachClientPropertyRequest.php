<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AttachClientPropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');

        return $lead !== null && ($this->user()?->can('update', $lead) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['property_id' => ['required', 'integer', Rule::exists('properties', 'id')]];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['property_id' => 'bien'];
    }
}
