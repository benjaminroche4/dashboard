<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Activity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $resource = fake()->randomElement(['leads', 'clients', 'invoices', 'quotes', 'visits', 'partners', 'documents']);

        return [
            'resource' => $resource,
            'message' => match ($resource) {
                'leads' => 'a créé le lead '.fake()->firstName().' '.fake()->lastName(),
                'clients' => 'a passé le dossier '.fake()->firstName().' '.fake()->lastName().' en priorité Haute',
                'invoices' => 'a créé la facture RP-27'.fake()->numerify('###'),
                'quotes' => 'a envoyé le devis DV-27'.fake()->numerify('###'),
                'visits' => 'a planifié une visite pour '.fake()->firstName().' '.fake()->lastName(),
                'partners' => 'a ajouté le partenaire '.fake()->company(),
                default => 'a créé une liste de documents pour '.fake()->firstName().' '.fake()->lastName(),
            },
            'user_id' => null,
            'lead_id' => null,
            'payload' => [],
            'created_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ];
    }

    public function resource(string $resource, string $message): static
    {
        return $this->state(fn (): array => ['resource' => $resource, 'message' => $message]);
    }
}
