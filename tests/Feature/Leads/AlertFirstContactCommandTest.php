<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Mail\FirstContactOverdue;
use App\Models\Lead;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

test('the command alerts the contact address and runs every minute', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    config()->set('company.first_contact.alert_email', 'contact@example.com');
    Lead::factory()->create(['created_at' => now()->subMinutes(45), 'last_contacted_at' => null]);

    $this->artisan('leads:alert-first-contact')
        ->expectsOutput('1 lead(s) signalé(s).')
        ->assertSuccessful();
    Mail::assertSent(FirstContactOverdue::class);

    $this->artisan('leads:alert-first-contact')->expectsOutput('Aucun lead en attente de premier contact.');

    $events = collect(resolve(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'leads:alert-first-contact'));
    expect($events)->toHaveCount(1)
        ->and($events->first()?->expression)->toBe('* * * * *');
});
