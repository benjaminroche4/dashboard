<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Database\Seeder;

/**
 * Leads d'exemple pour le développement.
 */
final class LeadSeeder extends Seeder
{
    public function run(): void
    {
        Lead::factory()->count(5)->create();
        Lead::factory()->count(4)->status(LeadStatus::Contacted)->create();
        Lead::factory()->count(3)->status(LeadStatus::InDiscussion)->create();
        Lead::factory()->count(4)->converted()->create();
        Lead::factory()->count(2)->status(LeadStatus::Lost)->create();
    }
}
