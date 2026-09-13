<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Où en est le dossier de location d'un client : c'est ce qui décide s'il
 * peut être présenté à une agence ou à un propriétaire.
 */
enum DossierStatus: string
{
    /** Aucune liste de pièces n'a encore été créée pour ce client. */
    case NotStarted = 'not_started';

    /** Des pièces manquent, ou l'équipe en a refusé. */
    case Incomplete = 'incomplete';

    /** Tout est arrivé, il reste des pièces à vérifier. */
    case ToCheck = 'to_check';

    /** Toutes les pièces demandées sont validées : le dossier part. */
    case Ready = 'ready';

    public function label(): string
    {
        return match ($this) {
            self::NotStarted => 'Pas commencé',
            self::Incomplete => 'Incomplet',
            self::ToCheck => 'À vérifier',
            self::Ready => 'Prêt',
        };
    }
}
