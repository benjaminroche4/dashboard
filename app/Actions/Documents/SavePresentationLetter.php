<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\User;

/**
 * Enregistre la lettre de présentation d'un dossier, telle que l'équipe l'a
 * relue : c'est ce texte, et lui seul, qui s'imprime en tête du PDF fusionné.
 */
final class SavePresentationLetter
{
    public function handle(DocumentRequest $request, ?string $letter, ?User $by = null): DocumentRequest
    {
        $letter = trim((string) $letter) ?: null;

        if ($request->presentation_letter === $letter) {
            return $request;
        }

        $request->forceFill(['presentation_letter' => $letter])->save();

        event(new DashboardUpdated(
            'documents',
            ['id' => $request->id, 'uuid' => $request->uuid],
            ($letter === null ? 'a retiré la lettre de présentation du dossier ' : 'a enregistré la lettre de présentation du dossier ').$request->fullName(),
            $by,
        ));

        return $request;
    }
}
