<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\StaffRole;

/**
 * Données validées nécessaires à la création d'un membre du staff.
 * Construit depuis une Form Request, une commande artisan ou un test.
 */
final readonly class StaffMemberData
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
        public StaffRole $role = StaffRole::Member,
    ) {}

    /**
     * @param  array{name: string, email: string, password: string, role?: StaffRole|string|null}  $data
     */
    public static function from(array $data): self
    {
        $role = $data['role'] ?? StaffRole::Member;

        return new self(
            name: $data['name'],
            email: $data['email'],
            password: $data['password'],
            role: $role instanceof StaffRole ? $role : StaffRole::from($role),
        );
    }

    /**
     * @return array{name: string, email: string, password: string, role: string}
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password,
            'role' => $this->role->value,
        ];
    }
}
