<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Rôles du staff. L'ordre des cas va du plus au moins privilégié.
 * Pour ajouter un rôle : un cas ici, son label, puis les règles dans les Policies.
 */
enum StaffRole: string
{
    case Admin = 'admin';
    case Manager = 'manager';
    case Member = 'member';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrateur',
            self::Manager => 'Manager',
            self::Member => 'Membre',
        };
    }

    public function isAdmin(): bool
    {
        return $this === self::Admin;
    }

    /**
     * Vrai si ce rôle est au moins aussi privilégié que $role.
     */
    public function atLeast(self $role): bool
    {
        return $this->rank() <= $role->rank();
    }

    private function rank(): int
    {
        return match ($this) {
            self::Admin => 0,
            self::Manager => 1,
            self::Member => 2,
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
