<?php

declare(strict_types=1);

namespace App\Http\Requests\Visits;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreVisitReportRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'report' => ['required', 'string', 'min:10', 'max:5000'],
            // Photos prises pendant la visite, ajoutées à celles déjà déposées.
            'photos' => ['nullable', 'array', 'max:10'],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['report' => 'compte rendu', 'photos' => 'photos', 'photos.*' => 'photo'];
    }
}
