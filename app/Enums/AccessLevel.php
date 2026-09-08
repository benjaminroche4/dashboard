<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Niveau d'accès d'un membre à une section du site.
 */
enum AccessLevel: string
{
    case None = 'none';
    case Read = 'read';
    case Write = 'write';
    case Manage = 'manage';

    public function label(): string
    {
        return match ($this) {
            self::None => 'Aucun accès',
            self::Read => 'Consulter',
            self::Write => 'Modifier',
            self::Manage => 'Gérer',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::None => 'La section disparaît du menu et ses pages sont refusées.',
            self::Read => 'Voir les listes et les fiches, sans rien changer.',
            self::Write => 'Créer, modifier et faire avancer les éléments.',
            self::Manage => 'Tout, y compris supprimer et les réglages sensibles.',
        };
    }

    public function rank(): int
    {
        return match ($this) {
            self::None => 0,
            self::Read => 1,
            self::Write => 2,
            self::Manage => 3,
        };
    }

    public function atLeast(self $level): bool
    {
        return $this->rank() >= $level->rank();
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label(), 'description' => $case->description()],
            self::cases(),
        );
    }
}
