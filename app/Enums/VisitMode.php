<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Façon dont la visite se déroule : l'équipe visite à la place du client, ou
 * le client visite seul. La visite autonome n'a de sens que sur la formule
 * « Accompagné », où le client est sur place.
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

    /** Vrai si ce mode est possible pour un client sur cette formule. */
    public function allowedFor(?Offer $offer): bool
    {
        return $this !== self::ClientAlone || $offer === Offer::Accompagne;
    }

    /**
     * @return list<array{value: string, label: string, hint: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => [
            'value' => $case->value,
            'label' => $case->label(),
            'hint' => $case->hint(),
        ], self::cases());
    }
}
