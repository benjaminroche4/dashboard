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
        $leads = collect([
            ...Lead::factory()->count(5)->create(),
            ...Lead::factory()->count(4)->status(LeadStatus::InProgress)->create(),
            ...Lead::factory()->count(3)->status(LeadStatus::QuoteSent)->create(),
            ...Lead::factory()->count(4)->converted()->create(),
            ...Lead::factory()->count(2)->status(LeadStatus::Archived)->create(),
        ]);

        $leads->groupBy(fn (Lead $lead): string => $lead->status->value)
            ->each(fn ($group) => $group->values()->each(fn (Lead $lead, int $index) => $lead->update(['position' => $index])));

        $leads->each(function (Lead $lead): void {
            $lead->statusChanges()->create(['from_status' => null, 'to_status' => LeadStatus::Todo, 'changed_by' => null, 'created_at' => $lead->created_at]);

            if ($lead->status !== LeadStatus::Todo) {
                $lead->statusChanges()->create(['from_status' => LeadStatus::Todo, 'to_status' => $lead->status, 'changed_by' => null, 'created_at' => now()]);
            }
        });

        LeadNote::factory()->count(6)->recycle($leads)->recycle(User::all())->create();
    }
}
