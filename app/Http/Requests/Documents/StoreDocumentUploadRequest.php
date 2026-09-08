<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Models\DocumentRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Dépôt de fichiers par le client sur la page publique : une personne du
 * foyer, une pièce demandée à cette personne, un à dix fichiers.
 */
class StoreDocumentUploadRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'person' => ['required', 'integer', 'min:0', 'max:3'],
            'document' => ['required', 'string', 'max:100'],
            'files' => ['required', 'array', 'min:1', 'max:10'],
            'files.*' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:10240'],
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.*.mimes' => __('Seul le format PDF est accepté.'),
            'files.*.mimetypes' => __('Seul le format PDF est accepté.'),
            'files.*.max' => __('Chaque fichier doit faire moins de 10 Mo.'),
            'files.max' => __('Dix fichiers au maximum à la fois.'),
        ];
    }
}
