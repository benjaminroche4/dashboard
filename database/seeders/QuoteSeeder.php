<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\QuoteStatus;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Devis d'exemple pour le développement : 24 devis sur six mois, chacun avec un auteur.
 */
final class QuoteSeeder extends Seeder
{
    public function run(): void
    {
        $creator = fn (): array => ['created_by' => User::query()->inRandomOrder()->value('id')];

        Quote::factory()->count(3)->status(QuoteStatus::Draft)->state($creator)->create();
        Quote::factory()->count(5)->state($creator)->create();
        Quote::factory()->count(6)->accepted()->state($creator)->create();
        Quote::factory()->count(5)->status(QuoteStatus::Invoiced)->state($creator)->create();
        Quote::factory()->count(4)->status(QuoteStatus::Declined)->state($creator)->create();
        Quote::factory()->expired()->state($creator)->create();
    }
}
