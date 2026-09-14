<?php

declare(strict_types=1);

namespace App\Http\Requests\Visits;

use App\Enums\PropertyApplicationStatus;
use App\Models\Visit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Validator;

class StoreVisitReportRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'report' => ['required', 'string', 'min:10', 'max:5000'],
            // Ce que devient le bien pour ce client : la prochaine étape du
            // suivi, facultative — on peut écrire sans encore trancher.
            'next_status' => ['nullable', Rule::enum(PropertyApplicationStatus::class)],
            // Photos prises pendant la visite, ajoutées à celles déjà déposées.
            'photos' => ['nullable', 'array', 'max:10'],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
            // Envoyer le compte rendu au client : décoché par défaut, l'équipe décide.
            'notify_client' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Le compte rendu se débloque après la visite : avant l'heure, il n'y a
     * rien à raconter, et une visite annulée n'en attend aucun.
     *
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $visit = $this->route('visit');

            if ($visit instanceof Visit && ! $visit->reportable()) {
                $validator->errors()->add('report', __('Le compte rendu s’écrit après la visite.'));
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'report' => 'impressions générales',
            'next_status' => 'prochaine étape',
            'photos' => 'photos',
            'photos.*' => 'photo',
            'notify_client' => 'envoi au client',
        ];
    }
}
