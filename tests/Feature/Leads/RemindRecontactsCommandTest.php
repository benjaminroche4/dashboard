<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Mail\RecontactsDue;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

test('the command reminds assignees and is scheduled every morning', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    $user = User::factory()->create();
    Lead::factory()->create(['assigned_to' => $user->id, 'recontact_at' => today()]);

    $this->artisan('leads:remind-recontacts')
        ->expectsOutput('1 responsable(s) prévenu(s).')
        ->assertSuccessful();
    Mail::assertQueued(RecontactsDue::class);

    $this->artisan('leads:remind-recontacts')->expectsOutput('1 responsable(s) prévenu(s).');

    $events = collect(resolve(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'leads:remind-recontacts'));
    expect($events)->toHaveCount(1)
        ->and($events->first()?->expression)->toBe('0 8 * * *');
});
