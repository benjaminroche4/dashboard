<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Mail\VisitReportDue;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

test('the command reminds visit assignees and runs every fifteen minutes', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    $user = User::factory()->create();
    Visit::factory()->create(['assigned_to' => $user->id, 'scheduled_at' => now()->subHours(2)]);

    $this->artisan('visits:remind-reports')
        ->expectsOutput('1 rappel(s) envoyé(s).')
        ->assertSuccessful();
    Mail::assertSent(VisitReportDue::class);

    $this->artisan('visits:remind-reports')->expectsOutput('Aucun compte rendu à rappeler.');

    $events = collect(resolve(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'visits:remind-reports'));
    expect($events)->toHaveCount(1)
        ->and($events->first()?->expression)->toBe('*/15 * * * *');
});
