<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Façon dont la visite se déroule : l'équipe visite à la place du client, ou
 * le client visite seul. Ce n'est pas un choix — la formule souscrite le dit
 * déjà : « Confié », nous faisons les visites ; « Accompagné », le client
 * visite lui-même et nous montons le dossier.
 */
enum VisitMode: string
{
    case ForClient = 'for_client';
    case ClientAlone = 'client_alone';

    public function label(): string
    {
        return match ($this) {
            self::ForClient => 'Visite réalisée par l’équipe',
            self::ClientAlone => 'Visite autonome du client',
        };
    }

    /** Formulation courte, pour les badges et les tableaux. */
    public function shortLabel(): string
    {
        return match ($this) {
            self::ForClient => 'Par l’équipe',
            self::ClientAlone => 'Visite autonome',
        };
    }

    public function hint(): string
    {
        return match ($this) {
            self::ForClient => 'Un membre de l’équipe se rend sur place, avec ou sans le client.',
            self::ClientAlone => 'Le client visite seul ; réservé à la formule Accompagné.',
        };
    }

    /**
     * Type de visite d'un client, déduit de sa formule. Sans formule connue,
     * l'équipe visite : c'est le cas le plus courant et le plus prudent.
     */
    public static function forOffer(?Offer $offer): self
    {
        return $offer === Offer::Accompagne ? self::ClientAlone : self::ForClient;
    }
}
