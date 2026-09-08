<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Enums\WebsiteHelpType;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    protected $model = Lead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LD-'.fake()->unique()->numerify('####'),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->safeEmail(),
            'phone' => '+33 6 '.fake()->numerify('## ## ## ##'),
            'company' => fake()->optional(0.6)->company(),
            'language' => fake()->randomElement(LeadLanguage::cases()),
            'offer' => fake()->randomElement(Offer::cases()),
            'arrival_at' => fake()->dateTimeBetween('+1 week', '+6 months')->format('Y-m-d'),
            'budget_cents' => fake()->numberBetween(15, 60) * 10_000,
            'currency' => Currency::EUR,
            'origin_city' => fake()->city(),
            'districts' => fake()->randomElements(range(1, 20), fake()->numberBetween(0, 4)),
            'property_types' => fake()->randomElements(PropertyType::cases(), fake()->numberBetween(1, 2)),
            'duration' => fake()->randomElement(LeadDuration::cases()),
            'guarantors' => fake()->boolean() ? fake()->randomElements(GuarantorType::cases(), fake()->numberBetween(1, 2)) : [],
            'furnished' => fake()->randomElement(Furnished::cases()),
            'source' => fake()->randomElement(LeadSource::cases()),
            'message' => fake()->optional()->sentence(12),
            'score' => fake()->optional(0.8)->numberBetween(1, 5),
            'source_note' => fake()->optional()->words(3, true),
            'recontact_channel' => fake()->optional()->randomElement(RecontactChannel::cases()),
            'recontact_at' => fake()->boolean() ? fake()->dateTimeBetween('now', '+2 weeks')->format('Y-m-d') : null,
            'qualification_note' => fake()->optional()->sentence(8),
            'status' => LeadStatus::Todo,
            'last_contacted_at' => null,
        ];
    }

    public function status(LeadStatus $status): static
    {
        return $this->state(fn (): array => [
            'status' => $status,
            'last_contacted_at' => $status === LeadStatus::Todo ? null : now()->subDays(fake()->numberBetween(0, 10)),
        ]);
    }

    /**
     * Lead arrivé à une date aléatoire des derniers mois, contacté peu après
     * (5 min à 3 h) s'il n'est plus « À traiter » : les rapports ont ainsi
     * une vraie courbe et un délai de premier contact plausible.
     */
    public function overLastMonths(int $months = 6): static
    {
        return $this->state(function (array $attributes) use ($months): array {
            $createdAt = fake()->dateTimeBetween("-{$months} months", 'now');
            $status = $attributes['status'] ?? LeadStatus::Todo;

            return [
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
                'last_contacted_at' => $status === LeadStatus::Todo ? null : (clone $createdAt)->modify('+'.fake()->numberBetween(5, 180).' minutes'),
            ];
        });
    }

    public function assignedTo(User $user): static
    {
        return $this->state(fn (): array => ['assigned_to' => $user->id]);
    }

    public function converted(): static
    {
        return $this->status(LeadStatus::Converted);
    }

    /** Lead propriétaire : demande de gestion locative reçue depuis le formulaire du site. */
    public function rentalManagement(): static
    {
        return $this->state(fn (): array => [
            'help_type' => WebsiteHelpType::RentalManagement,
            'source' => LeadSource::Website,
            'source_note' => 'Formulaire de contact · Gestion locative · CT-'.fake()->unique()->numerify('######'),
            'offer' => null,
            'budget_cents' => null,
            'arrival_at' => null,
            'company' => fake()->optional(0.4)->company(),
            'message' => fake()->randomElement([
                'Je possède un appartement dans le 11e que je souhaite mettre en gestion.',
                'Deux studios à louer meublés, je cherche un gestionnaire de confiance.',
                'Propriétaire d\'un T3 dans le 15e, actuellement vacant.',
                'Je pars à l\'étranger et souhaite confier la gestion de mon bien.',
            ]),
        ]);
    }
}
