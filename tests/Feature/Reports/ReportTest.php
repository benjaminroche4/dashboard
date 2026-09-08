<?php

declare(strict_types=1);

use App\Actions\Reports\BuildReport;
use App\Enums\InvoiceStatus;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\QuoteStatus;
use App\Enums\VisitStatus;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia;

test('guests are redirected and staff open the report over the last twelve months by default', function (): void {
    $this->get(route('tools.reports.index'))->assertRedirect(route('login'));

    Date::setTestNow('2026-09-07 10:00:00');

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('reports/index')
            ->where('months', 12)
            ->where('periods', [3, 6, 12, 24])
            ->where('report.period.from', '2025-10-01')
            ->where('report.period.to', '2026-09-07')
            ->has('report.invoices.by_month', 12)
            ->where('report.invoices.by_month.11.month', '2026-09')
            ->where('report.leads.total', 0));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['months' => 3]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('months', 3)
            ->where('report.period.from', '2026-07-01')
            ->has('report.invoices.by_month', 3));

    $this->actingAs(User::factory()->create())
        ->get(route('tools.reports.index', ['months' => 5]))
        ->assertSessionHasErrors('months');
});

test('the report counts leads by source with conversion and the first-contact delay', function (): void {
    Date::setTestNow('2026-09-07 10:00:00');
    Lead::factory()->create(['source' => LeadSource::Website, 'status' => LeadStatus::Converted, 'created_at' => now()->subDays(3), 'last_contacted_at' => now()->subDays(3)->addMinutes(10)]);
    Lead::factory()->create(['source' => LeadSource::Website, 'status' => LeadStatus::Todo, 'created_at' => now()->subDays(2), 'last_contacted_at' => now()->subDays(2)->addMinutes(50)]);
    Lead::factory()->create(['source' => LeadSource::Phone, 'status' => LeadStatus::Archived, 'created_at' => now()->subDay(), 'last_contacted_at' => null]);
    Lead::factory()->create(['source' => LeadSource::Phone, 'status' => LeadStatus::Converted, 'created_at' => now()->subYears(2)]);

    $report = (new BuildReport)->handle(now()->subMonths(11)->startOfMonth(), now());

    expect($report['leads']['total'])->toBe(3)
        ->and($report['leads']['converted'])->toBe(1)
        ->and($report['leads']['archived'])->toBe(1)
        ->and($report['leads']['conversion_rate'])->toBe(33.3)
        ->and($report['leads']['by_source'])->toHaveCount(2)
        ->and($report['leads']['by_source'][0])->toMatchArray(['label' => 'Site web', 'count' => 2, 'converted' => 1, 'rate' => 50.0])
        ->and($report['leads']['by_source'][1])->toMatchArray(['label' => 'Téléphone', 'count' => 1, 'converted' => 0, 'rate' => 0.0])
        ->and($report['leads']['first_contact'])->toBe(['measured' => 2, 'average_minutes' => 30, 'within_30_rate' => 50.0])
        ->and(collect($report['leads']['by_status'])->firstWhere('status', 'todo')['count'])->toBe(1);
});

test('the report measures quotes by offer and invoices issued, paid and overdue per month', function (): void {
    Date::setTestNow('2026-09-07 10:00:00');
    Quote::factory()->accepted()->create(['issued_at' => '2026-09-01', 'currency' => 'EUR', 'amount_cents' => 100_000, 'items' => [['offer' => 'confie', 'description' => 'Offre Confié', 'quantity' => 1, 'unit_price_cents' => 100_000]]]);
    Quote::factory()->status(QuoteStatus::Declined)->create(['issued_at' => '2026-08-15', 'items' => [['offer' => 'confie', 'description' => 'Offre Confié', 'quantity' => 1, 'unit_price_cents' => 1]]]);
    Quote::factory()->status(QuoteStatus::Invoiced)->create(['issued_at' => '2026-08-01', 'currency' => 'CHF', 'amount_cents' => 50_000, 'items' => [['offer' => 'accompagne', 'description' => 'Offre Accompagné', 'quantity' => 1, 'unit_price_cents' => 50_000]]]);
    Quote::factory()->create(['issued_at' => '2026-09-02', 'items' => [['offer' => 'accompagne', 'description' => 'x', 'quantity' => 1, 'unit_price_cents' => 1]]]);
    Quote::factory()->create(['issued_at' => '2025-01-01']);

    Invoice::factory()->create(['issued_at' => '2026-09-03', 'currency' => 'EUR', 'amount_cents' => 100_000, 'status' => InvoiceStatus::Sent]);
    Invoice::factory()->paid()->create(['issued_at' => '2026-08-03', 'paid_at' => '2026-09-05', 'currency' => 'EUR', 'amount_cents' => 40_000]);
    Invoice::factory()->overdue()->create(['currency' => 'CHF', 'amount_cents' => 25_000]);
    Invoice::factory()->create(['issued_at' => '2026-09-04', 'status' => InvoiceStatus::Cancelled, 'amount_cents' => 999_999]);

    $report = (new BuildReport)->handle(now()->subMonths(2)->startOfMonth(), now());

    expect($report['quotes']['total'])->toBe(4)
        ->and($report['quotes']['acceptance_rate'])->toBe(66.7)
        ->and($report['quotes']['accepted_amounts'])->toBe(['CHF' => 50_000, 'EUR' => 100_000])
        ->and(collect($report['quotes']['by_offer'])->firstWhere('offer', 'confie'))->toMatchArray(['count' => 2, 'accepted' => 1, 'declined' => 1, 'rate' => 50.0])
        ->and(collect($report['quotes']['by_offer'])->firstWhere('offer', 'accompagne'))->toMatchArray(['count' => 2, 'accepted' => 1, 'declined' => 0, 'rate' => 100.0]);

    $september = collect($report['invoices']['by_month'])->firstWhere('month', '2026-09');
    expect($report['invoices']['count'])->toBe(3)
        ->and($report['invoices']['paid_count'])->toBe(1)
        ->and($report['invoices']['issued']['EUR'])->toBe(140_000)
        ->and($report['invoices']['paid']['EUR'])->toBe(40_000)
        ->and($report['invoices']['overdue'])->toBe(['count' => 1, 'amounts' => ['CHF' => 25_000, 'EUR' => 0]])
        ->and($september['issued']['EUR'])->toBe(100_000)
        ->and($september['paid']['EUR'])->toBe(40_000)
        ->and($september['label'])->toBe('Sept. 2026');
});

test('the report compares leads day by day between the current and the previous month, and details offers and assignees', function (): void {
    Date::setTestNow('2026-09-07 10:00:00');
    $charles = User::factory()->create(['name' => 'Charles']);
    Lead::factory()->count(2)->create(['created_at' => '2026-09-03 09:00:00', 'assigned_to' => $charles->id, 'offer' => Offer::Confie]);
    Lead::factory()->create(['created_at' => '2026-09-07 09:00:00', 'assigned_to' => null, 'offer' => null]);
    Lead::factory()->create(['created_at' => '2026-08-03 09:00:00', 'assigned_to' => null, 'offer' => Offer::Accompagne]);
    Lead::factory()->create(['created_at' => '2026-08-31 09:00:00']);
    Lead::factory()->create(['created_at' => '2026-07-31 09:00:00']);

    $report = (new BuildReport)->handle(now()->startOfMonth(), now());
    $daily = $report['leads']['daily'];

    expect($daily['current'])->toBe('Septembre 2026')
        ->and($daily['previous'])->toBe('Août 2026')
        ->and($daily['days'])->toHaveCount(31)
        ->and($daily['days'][2])->toBe(['day' => 3, 'current' => 2, 'previous' => 1])
        ->and($daily['days'][6])->toBe(['day' => 7, 'current' => 1, 'previous' => 0])
        ->and($daily['days'][7]['current'])->toBeNull()
        ->and($daily['days'][30])->toBe(['day' => 31, 'current' => null, 'previous' => 1])
        ->and(collect($report['leads']['by_offer'])->pluck('count', 'label')->all())->toBe(['Accompagné' => 0, 'Confié' => 2, 'Sans formule' => 1])
        ->and($report['leads']['by_assignee'][0])->toMatchArray(['label' => 'Charles', 'count' => 2])
        ->and($report['leads']['by_assignee'][1])->toMatchArray(['assignee' => null, 'label' => 'Non attribué', 'count' => 1]);
});

test('the report counts visits day by day over the last eight weeks and visits booked per member', function (): void {
    Date::setTestNow('2026-09-08 10:00:00'); // mardi
    $charles = User::factory()->create(['name' => 'Charles']);
    $camille = User::factory()->create(['name' => 'Camille']);
    Visit::factory()->count(2)->create(['scheduled_at' => '2026-09-07 10:00:00', 'created_by' => $charles->id]);
    Visit::factory()->status(VisitStatus::Done)->create(['scheduled_at' => '2026-09-08 15:00:00', 'created_by' => $charles->id]);
    Visit::factory()->status(VisitStatus::Cancelled)->create(['scheduled_at' => '2026-09-08 16:00:00', 'created_by' => $camille->id]);
    Visit::factory()->create(['scheduled_at' => '2026-08-30 11:00:00', 'created_by' => null]); // dimanche, semaine précédente
    Visit::factory()->create(['scheduled_at' => '2026-07-01 11:00:00', 'created_by' => $camille->id]); // hors des huit semaines

    $report = (new BuildReport)->handle(now()->subMonths(3)->startOfMonth(), now());
    $visits = $report['visits'];

    expect($visits['total'])->toBe(6)
        ->and($visits['done'])->toBe(1)
        ->and($visits['cancelled'])->toBe(1)
        ->and($visits['weekly'])->toHaveCount(8)
        ->and($visits['weekly'][7]['week'])->toBe('2026-W37')
        ->and(array_column($visits['weekly'][7]['days'], 'count'))->toBe([2, 1, 0, 0, 0, 0, 0])
        ->and($visits['weekly'][7]['total'])->toBe(3)
        ->and($visits['weekly'][7]['daily_average'])->toBe(0.4)
        ->and($visits['weekly'][5]['days'][6])->toMatchArray(['day' => 'Dim', 'count' => 1])
        ->and($visits['weekly'][0]['total'])->toBe(0)
        ->and($visits['by_booker'][0])->toMatchArray(['label' => 'Charles', 'count' => 3, 'done' => 1, 'cancelled' => 0])
        ->and($visits['by_booker'][1])->toMatchArray(['label' => 'Camille', 'count' => 2, 'cancelled' => 1])
        ->and($visits['by_booker'][2])->toMatchArray(['user' => null, 'label' => 'Sans auteur', 'count' => 1]);
});
