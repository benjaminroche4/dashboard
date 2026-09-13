<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Models\DocumentRequest;
use App\Support\UploadLimits;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\App;
use Illuminate\Validation\Validator;

/**
 * Dépôt de fichiers par le client sur la page publique : une personne du
 * foyer, une pièce demandée à cette personne, un à dix fichiers.
 */
class StoreDocumentUploadRequest extends FormRequest
{
    /**
     * La validation tourne **avant** le contrôleur et son `inLocale()` : sans
     * cela, un client anglophone recevrait ses erreurs en français.
     */
    protected function prepareForValidation(): void
    {
        $request = $this->route('documentRequest');

        if ($request instanceof DocumentRequest) {
            App::setLocale($request->language->value);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'person' => ['required', 'integer', 'min:0', 'max:3'],
            'document' => ['required', 'string', 'max:100'],
            // Les bornes suivent ce que PHP accepte vraiment sur cette machine.
            'files' => ['required', 'array', 'min:1', 'max:'.UploadLimits::maxFiles()],
            'files.*' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:'.(int) (UploadLimits::perFile() / 1024)],
        ];
    }

    /**
     * La pièce doit bien être demandée à cette personne dans la liste visée.
     *
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var DocumentRequest $request */
                $request = $this->route('documentRequest');
                $person = $request->persons[(int) $this->input('person')] ?? null;

                if ($person === null || ! in_array((string) $this->input('document'), $person['documents'], true)) {
                    $validator->errors()->add('document', __('Cette pièce n’est pas demandée pour cette personne.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'person' => __('personne'),
            'document' => __('pièce'),
            'files' => __('fichiers'),
            'files.*' => __('fichier'),
        ];
    }

    /** « 10 Mo », tel que le client le lit. */
    public static function megabytes(int $bytes): string
    {
        return round($bytes / 1024 / 1024, 1).' Mo';
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.*.mimes' => __('Seul le format PDF est accepté.'),
            'files.*.mimetypes' => __('Seul le format PDF est accepté.'),
            'files.*.max' => __('Chaque fichier doit faire moins de :size.', ['size' => self::megabytes(UploadLimits::perFile())]),
            'files.max' => __(':count fichiers au maximum à la fois.', ['count' => UploadLimits::maxFiles()]),
        ];
    }
}
