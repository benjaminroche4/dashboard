<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Une quarantaine d'entrées du journal sur les 30 derniers jours, signées
 * par les membres de l'équipe et rattachées aux leads existants.
 */
final class ActivitySeeder extends Seeder
{
    public const int COUNT = 40;

    public function run(): void
    {
        $users = User::query()->orderBy('id')->get();
        $leads = Lead::query()->orderBy('id')->get();

        Activity::factory()->count(self::COUNT)->make()->each(function (Activity $activity) use ($users, $leads): void {
            $actor = $users->isEmpty() ? null : $users->random();
            $lead = $leads->isEmpty() ? null : $leads->random();

            if ($lead instanceof Lead && in_array($activity->resource, ['leads', 'clients'], true)) {
                $activity->lead_id = $lead->id;
                $activity->payload = ['id' => $lead->id];
                $activity->message = $activity->resource === 'leads'
                    ? "a créé le lead {$lead->fullName()}"
                    : "a passé le dossier {$lead->fullName()} en priorité Haute";
            }

            $activity->user_id = $actor?->id;
            $activity->save();
        });
    }
}
