<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DossierStatus;

/**
 * État du dossier de location d'un client : combien de pièces demandées, et
 * où elles en sont. C'est la mesure qui dit si le dossier est présentable.
 */
final readonly class DossierReadinessData
{
    public function __construct(
        public DossierStatus $status,
        /** Pièces demandées, toutes personnes du foyer confondues. */
        public int $total = 0,
        /** Pièces dont un fichier a été validé par l'équipe. */
        public int $accepted = 0,
        /** Pièces reçues mais pas encore vérifiées. */
        public int $toCheck = 0,
        /** Pièces dont le seul fichier a été refusé : à redéposer. */
        public int $refused = 0,
        /** Pièces sans aucun fichier. */
        public int $missing = 0,
    ) {}

    /** Part des pièces validées, de 0 à 100. */
    public function percent(): int
    {
        return $this->total === 0 ? 0 : (int) round($this->accepted / $this->total * 100);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'total' => $this->total,
            'accepted' => $this->accepted,
            'to_check' => $this->toCheck,
            'refused' => $this->refused,
            'missing' => $this->missing,
            'percent' => $this->percent(),
        ];
    }
}
