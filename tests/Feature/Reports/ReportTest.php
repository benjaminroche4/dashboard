<?php

declare(strict_types=1);

use App\Actions\Reports\BuildReport;
use App\Enums\VisitStatus;
use App\Models\Lead;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia;

test('guests are redirected and staff open the report over the last thirty days by default', function (): void {
    $this->get(route('tools.reports.index'))->assertRedirect(route('login'));

    Date::setTestNow('2026-09-07 10:00:00');

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('reports/index')
            ->where('period', 'days30')
            ->where('periods.0', ['value' => 'day', 'label' => "Aujourd'hui"])
            ->has('periods', 6)
            ->where('report.period.from', '2026-08-09')
            ->where('report.period.to', '2026-09-07')
            ->where('report.granularity', 'day')
            ->has('report.visits.series', 30)
            ->has('report.leads.series', 30)
            ->has('report.visits.by_booker')
            ->where('report.leads.total', 0)
            ->where('report.visits.total', 0)
            ->missing('report.quotes')
            ->missing('report.invoices'));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['period' => 'day']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('period', 'day')
            ->where('report.period.from', '2026-09-07'));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['period' => 'week']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('report.period.from', '2026-09-01'));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['period' => 'months6']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('report.period.from', '2026-04-01'));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['period' => 'months12']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('report.period.from', '2025-10-01'));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['period' => 'trimestre']))
        ->assertSessionHasErrors('period');
});

test('a custom period reads the two dates, and refuses an incomplete or reversed range', function (): void {
    Date::setTestNow('2026-09-07 10:00:00');
    $member = User::factory()->create();

    $this->actingAs($member)
        ->get(route('tools.reports.index', ['period' => 'custom', 'from' => '2026-02-10', 'to' => '2026-03-15']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('period', 'custom')
            ->where('report.period.from', '2026-02-10')
            ->where('report.period.to', '2026-03-15'));

    $this->actingAs($member)
        ->get(route('tools.reports.index', ['period' => 'custom', 'from' => '2026-02-10']))
        ->assertSessionHasErrors('to');

    $this->actingAs($member)
        ->get(route('tools.reports.index', ['period' => 'custom', 'from' => '2026-03-15', 'to' => '2026-02-10']))
        ->assertSessionHasErrors('to');
});

test('the leads curve follows the period and compares it to the previous one', function (): void {
    Date::setTestNow('2026-09-09 10:00:00');
    Lead::factory()->count(2)->create(['created_at' => '2026-09-09 09:00:00']);
    Lead::factory()->create(['created_at' => '2026-09-08 09:00:00']);
    Lead::factory()->count(3)->create(['created_at' => '2026-09-07 09:00:00']); // veille de la période précédente
    Lead::factory()->create(['created_at' => '2026-06-01 09:00:00']); // hors période

    // Deux jours : une tranche par heure, comparées aux deux jours précédents.
    $report = (new BuildReport)->handle(Date::parse('2026-09-08'), Date::parse('2026-09-09'));

    expect($report['granularity'])->toBe('hour')
        ->and($report['leads']['total'])->toBe(3)
        ->and($report['leads']['previous_total'])->toBe(3)
        ->and($report['leads']['series'])->toHaveCount(48)
        ->and($report['leads']['series'][9])->toBe(['label' => '09h00', 'current' => 1, 'previous' => 0])
        ->and($report['leads']['series'][33])->toBe(['label' => '09h00', 'current' => 2, 'previous' => 3]);

    // Un mois : une tranche par jour.
    $month = (new BuildReport)->handle(Date::parse('2026-08-11'), Date::parse('2026-09-09'));

    expect($month['granularity'])->toBe('day')
        ->and($month['leads']['series'])->toHaveCount(30)
        ->and($month['leads']['total'])->toBe(6)
        ->and(end($month['leads']['series']))->toMatchArray(['label' => '9 sept.', 'current' => 2]);

    // Un an : une tranche par mois.
    $year = (new BuildReport)->handle(Date::parse('2025-10-01'), Date::parse('2026-09-09'));

    expect($year['granularity'])->toBe('month')
        ->and($year['leads']['series'])->toHaveCount(12)
        ->and($year['leads']['total'])->toBe(7);
});

test('the visits curve follows the same period and slices', function (): void {
    Date::setTestNow('2026-09-09 10:00:00');
    Visit::factory()->count(2)->create(['scheduled_at' => '2026-09-07 10:00:00']);
    Visit::factory()->status(VisitStatus::Done)->create(['scheduled_at' => '2026-09-08 15:00:00']);
    Visit::factory()->status(VisitStatus::Cancelled)->create(['scheduled_at' => '2026-09-08 16:00:00']);
    Visit::factory()->create(['scheduled_at' => '2026-05-30 11:00:00']); // hors période

    $report = (new BuildReport)->handle(Date::parse('2026-08-11'), Date::parse('2026-09-09'));
    $visits = $report['visits'];

    expect($visits['total'])->toBe(3)
        ->and($visits['series'])->toHaveCount(30)
        ->and($visits['series'][27])->toBe(['label' => '7 sept.', 'count' => 2])
        ->and($visits['series'][28])->toBe(['label' => '8 sept.', 'count' => 1])
        ->and($visits['series'][29])->toBe(['label' => '9 sept.', 'count' => 0]);

    // Une journée sans visite : la courbe existe quand même, à zéro.
    $today = (new BuildReport)->handle(Date::parse('2026-09-09'), Date::parse('2026-09-09'));

    expect($today['visits']['total'])->toBe(0)
        ->and($today['visits']['series'])->toHaveCount(24)
        ->and($today['visits']['by_booker'])->toBe([]);
});

test('the report tells who booked the visits of the period', function (): void {
    Date::setTestNow('2026-09-08 10:00:00');
    $charles = User::factory()->create(['name' => 'Charles']);
    $lea = User::factory()->create(['name' => 'Léa']);

    Visit::factory()->count(2)->create(['scheduled_at' => '2026-09-07 10:00:00', 'created_by' => $charles->id]);
    Visit::factory()->status(VisitStatus::Done)->create(['scheduled_at' => '2026-09-02 10:00:00', 'created_by' => $charles->id]);
    Visit::factory()->status(VisitStatus::Cancelled)->create(['scheduled_at' => '2026-09-03 10:00:00', 'created_by' => $lea->id]);
    Visit::factory()->create(['scheduled_at' => '2026-09-04 10:00:00', 'created_by' => null]);
    Visit::factory()->create(['scheduled_at' => '2026-01-04 10:00:00', 'created_by' => $lea->id]); // hors période

    $bookers = (new BuildReport)->handle(now()->subDays(29)->startOfDay(), now())['visits']['by_booker'];

    expect($bookers)->toBe([
        ['name' => 'Charles', 'avatar' => null, 'total' => 3, 'done' => 1, 'cancelled' => 0],
        ['name' => 'Léa', 'avatar' => null, 'total' => 1, 'done' => 0, 'cancelled' => 1],
        ['name' => 'Sans auteur', 'avatar' => null, 'total' => 1, 'done' => 0, 'cancelled' => 0],
    ]);
});
