<?php

declare(strict_types=1);

use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Models\Visit;
use Carbon\CarbonImmutable;
use Database\Seeders\BusyVisitDaySeeder;

test('the busy day seeder fills the next monday with visits the map can show', function (): void {
    $this->seed(BusyVisitDaySeeder::class);

    $visits = Visit::query()->with('property')->get();

    expect($visits)->toHaveCount(BusyVisitDaySeeder::VISITS);

    $monday = CarbonImmutable::today();
    $monday = $monday->isMonday() ? $monday : $monday->next('monday');

    // Toutes le même jour, un lundi, de 8 h à 20 h, et planifiées.
    expect($visits->every(fn (Visit $visit): bool => $visit->scheduled_at->isSameDay($monday)))->toBeTrue()
        ->and($visits->every(fn (Visit $visit): bool => $visit->scheduled_at->hour >= 8 && $visit->scheduled_at->hour < 20))->toBeTrue()
        ->and($visits->every(fn (Visit $visit): bool => $visit->status === VisitStatus::Planned))->toBeTrue()
        // Chaque bien est géocodé : sans position, la carte de la tournée est vide.
        ->and($visits->every(fn (Visit $visit): bool => $visit->property->latitude !== null))->toBeTrue()
        // Une journée crédible : un bien par visite, et plusieurs clients.
        ->and($visits->pluck('property_id')->unique())->toHaveCount(BusyVisitDaySeeder::VISITS)
        ->and($visits->pluck('lead_id')->unique()->count())->toBeGreaterThan(5);
});

test('each visit carries the mode its client offer implies', function (): void {
    $this->seed(BusyVisitDaySeeder::class);

    foreach (Visit::query()->with('lead')->get() as $visit) {
        expect($visit->mode)->toBe(VisitMode::forOffer($visit->lead->offer));
    }
});
