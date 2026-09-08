<?php

declare(strict_types=1);

namespace App\Http\Requests\Staff;

use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Enums\StaffFunction;
use App\Enums\StaffRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffAccessRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'role' => ['nullable', Rule::enum(StaffRole::class)],
            // Absent ou null : droits du rôle. Sinon un niveau par section.
            'permissions' => ['nullable', 'array:'.implode(',', array_column(SiteSection::cases(), 'value'))],
            'functions' => ['present', 'array'],
            'functions.*' => [Rule::enum(StaffFunction::class), 'distinct'],
        ];

        foreach (SiteSection::cases() as $section) {
            $rules["permissions.{$section->value}"] = ['required_with:permissions', Rule::enum(AccessLevel::class)];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['role' => 'rôle', 'permissions' => 'droits', 'functions' => 'fonctions'];
    }
}
