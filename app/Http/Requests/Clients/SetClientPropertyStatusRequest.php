<?php

declare(strict_types=1);

namespace App\Http\Requests\Clients;

use App\Enums\PropertyApplicationStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Suite donnée à un bien visité, pour un dossier client. */
class SetClientPropertyStatusRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['status' => ['required', Rule::enum(PropertyApplicationStatus::class)]];
    }

    public function status(): PropertyApplicationStatus
    {
        return PropertyApplicationStatus::from((string) $this->validated('status'));
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['status' => 'suite de la visite'];
    }
}
