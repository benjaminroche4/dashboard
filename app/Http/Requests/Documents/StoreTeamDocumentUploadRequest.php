<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Models\DocumentRequest;

/**
 * Dépôt d'une pièce **par un membre de l'équipe**, depuis la fiche d'une
 * liste : mêmes bornes et même contrôle (la pièce doit être demandée à cette
 * personne) que le dépôt public, mais l'erreur se lit dans la langue du
 * backoffice, pas dans celle du client, et il faut pouvoir modifier la liste.
 */
class StoreTeamDocumentUploadRequest extends StoreDocumentUploadRequest
{
    public function authorize(): bool
    {
        $request = $this->route('documentRequest');

        return $request instanceof DocumentRequest
            && ($this->user()?->can('update', $request) ?? false);
    }

    /** Pas de bascule de langue : c'est un membre qui lit les erreurs. */
    protected function prepareForValidation(): void {}
}
