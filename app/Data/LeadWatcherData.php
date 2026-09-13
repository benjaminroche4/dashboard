<?php

declare(strict_types=1);

namespace App\Data;

/** Personne de suivi d'un dossier : un nom, une adresse, un lien. */
final readonly class LeadWatcherData
{
    public function __construct(
        public string $name,
        public string $email,
        public ?string $phone,
        /** Ce qu'elle est pour le client : « Mère », « Service RH »… */
        public ?string $role,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $role = is_string($data['role'] ?? null) ? trim($data['role']) : null;
        $phone = is_string($data['phone'] ?? null) ? trim($data['phone']) : null;

        return new self(
            name: trim((string) $data['name']),
            // L'adresse sert de clé sur le dossier : la casse ne doit pas
            // faire passer deux fois la même personne.
            email: mb_strtolower(trim((string) $data['email'])),
            phone: $phone === '' ? null : $phone,
            role: $role === '' ? null : $role,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['name' => $this->name, 'email' => $this->email, 'phone' => $this->phone, 'role' => $this->role];
    }
}
