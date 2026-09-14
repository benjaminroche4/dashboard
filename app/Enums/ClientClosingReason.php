<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Pourquoi un dossier client se ferme. Rien à voir avec le motif de perte d'un
 * lead (« Pas du tout qualifié », « Trop petit budget ») : ici le client a été
 * accompagné, et on note comment l'histoire s'est terminée.
 */
enum ClientClosingReason: string
{
    case Installed = 'installed';
    case Withdrawn = 'withdrawn';
    case NoHome = 'no_home';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Installed => 'Client installé',
            self::Withdrawn => 'Client parti ou sans suite',
            self::NoHome => 'Aucun logement trouvé',
            self::Other => 'Autre',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
