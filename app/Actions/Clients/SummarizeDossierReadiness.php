<?php

declare(strict_types=1);

namespace App\Actions\Clients;

use App\Data\DossierReadinessData;
use App\Enums\DocumentUploadStatus;
use App\Enums\DossierStatus;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use Illuminate\Support\Collection;

/**
 * Où en est le dossier de location d'un client : on compte **les pièces
 * demandées**, pas les fichiers. Une pièce est validée dès qu'un de ses
 * fichiers l'est ; refusée quand elle n'a que des refus (le client doit en
 * redéposer un) ; à vérifier quand un fichier attend l'équipe ; manquante
 * quand rien n'est arrivé.
 */
final class SummarizeDossierReadiness
{
    public function handle(Lead $lead): DossierReadinessData
    {
        $lead->loadMissing(['documentRequests.uploads']);

        if ($lead->documentRequests->isEmpty()) {
            return new DossierReadinessData(DossierStatus::NotStarted);
        }

        $accepted = 0;
        $toCheck = 0;
        $refused = 0;
        $missing = 0;

        foreach ($lead->documentRequests as $request) {
            foreach ($request->persons as $index => $person) {
                foreach ($person['documents'] as $key) {
                    match ($this->pieceStatus($request, $index, $key)) {
                        DocumentUploadStatus::Accepted => $accepted++,
                        DocumentUploadStatus::Refused => $refused++,
                        DocumentUploadStatus::Pending => $toCheck++,
                        default => $missing++,
                    };
                }
            }
        }

        $total = $accepted + $toCheck + $refused + $missing;

        return new DossierReadinessData(
            status: $this->status($total, $accepted, $toCheck),
            total: $total,
            accepted: $accepted,
            toCheck: $toCheck,
            refused: $refused,
            missing: $missing,
        );
    }

    /** État d'une pièce : validée, à vérifier, refusée, ou rien (null). */
    private function pieceStatus(DocumentRequest $request, int $person, string $key): ?DocumentUploadStatus
    {
        /** @var Collection<int, DocumentUpload> $uploads */
        $uploads = $request->uploads
            ->where('person_index', $person)
            ->where('document_key', $key);

        if ($uploads->isEmpty()) {
            return null;
        }

        // Le meilleur fichier l'emporte : un refus ne compte que s'il est seul.
        foreach ([DocumentUploadStatus::Accepted, DocumentUploadStatus::Pending] as $status) {
            if ($uploads->contains(fn (DocumentUpload $upload): bool => $upload->status === $status)) {
                return $status;
            }
        }

        return DocumentUploadStatus::Refused;
    }

    private function status(int $total, int $accepted, int $toCheck): DossierStatus
    {
        if ($total === 0) {
            return DossierStatus::NotStarted;
        }

        if ($accepted === $total) {
            return DossierStatus::Ready;
        }

        // Tout est arrivé et rien n'est refusé : il ne reste qu'à vérifier.
        return $accepted + $toCheck === $total ? DossierStatus::ToCheck : DossierStatus::Incomplete;
    }
}
