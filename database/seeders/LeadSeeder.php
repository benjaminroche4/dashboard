<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Leads d'exemple pour le développement.
 */
final class LeadSeeder extends Seeder
{
    public function run(): void
    {
        // Six mois d'activité pour les rapports : les leads « À traiter » restent récents,
        // les autres sont répartis sur la période avec un premier contact rapide.
        $leads = collect([
            ...Lead::factory()->count(6)->create(),
            ...Lead::factory()->count(10)->status(LeadStatus::InProgress)->overLastMonths()->create(),
            ...Lead::factory()->count(8)->status(LeadStatus::QuoteSent)->overLastMonths()->create(),
            ...Lead::factory()->count(22)->converted()->overLastMonths()->create(),
            ...Lead::factory()->count(12)->status(LeadStatus::Archived)->overLastMonths()->create(),
        ]);

        $leads->groupBy(fn (Lead $lead): string => $lead->status->value)
            ->each(fn ($group) => $group->values()->each(fn (Lead $lead, int $index) => $lead->update(['position' => $index])));

        $leads->each(function (Lead $lead): void {
            $lead->statusChanges()->create(['from_status' => null, 'to_status' => LeadStatus::Todo, 'changed_by' => null, 'created_at' => $lead->created_at]);

            if ($lead->status !== LeadStatus::Todo) {
                $lead->statusChanges()->create(['from_status' => LeadStatus::Todo, 'to_status' => $lead->status, 'changed_by' => null, 'created_at' => $lead->last_contacted_at ?? now()]);
            }
        });

        $staff = User::all();
        $leads->each(fn (Lead $lead) => fake()->boolean(70) ? $lead->update(['assigned_to' => $staff->random()->id]) : null);

        LeadNote::factory()->count(20)->recycle($leads)->recycle($staff)->create();
    }
}
