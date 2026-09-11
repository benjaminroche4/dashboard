<?php

declare(strict_types=1);

use App\Enums\VisitStatus;
use App\Models\Property;
use App\Models\Visit;
use Database\Seeders\LeadSeeder;
use Database\Seeders\PropertySeeder;
use Database\Seeders\RealEstateSeeder;
use Database\Seeders\StaffSeeder;

it('seeds properties and assigned visits, two of them reported and one awaiting its report', function (): void {
    $this->seed([StaffSeeder::class, LeadSeeder::class, RealEstateSeeder::class, PropertySeeder::class]);

    expect(Property::query()->count())->toBe(12)
        ->and(Property::query()->whereNotNull('agent_id')->count())->toBe(6)
        ->and(Visit::query()->count())->toBe(17)
        ->and(Visit::query()->whereNull('assigned_to')->exists())->toBeFalse()
        ->and(Visit::query()->where('status', VisitStatus::Planned)->count())->toBe(13)
        ->and(Visit::query()->where('status', VisitStatus::Done)->count())->toBe(3)
        ->and(Visit::query()->whereNotNull('report')->count())->toBe(2)
        ->and(Visit::query()->awaitingReport()->count())->toBe(1)
        ->and(Visit::query()->awaitingReport()->whereNull('report_reminded_at')->count())->toBe(1);
});

it('groups planned visits into touring days, so the day map and its route have something to show', function (): void {
    $this->seed([StaffSeeder::class, LeadSeeder::class, RealEstateSeeder::class, PropertySeeder::class]);

    $perDay = Visit::query()
        ->where('status', VisitStatus::Planned)
        ->get()
        ->groupBy(fn (Visit $visit): string => $visit->scheduled_at->toDateString())
        ->map->count();

    // Trois journées de tournée, dans un et trois et huit jours ; des visites
    // isolées peuvent tomber le même jour, d'où le minimum plutôt que l'égalité.
    foreach ([1 => 3, 3 => 4, 8 => 3] as $days => $least) {
        expect($perDay->get(now()->addDays($days)->toDateString(), 0))
            ->toBeGreaterThanOrEqual($least);
    }
});
