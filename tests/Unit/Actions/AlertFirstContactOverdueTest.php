<?php

declare(strict_types=1);

use App\Actions\Leads\AlertFirstContactOverdue;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\FirstContactOverdue;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    config()->set('company.first_contact.alert_email', 'contact@example.com');
    config()->set('company.first_contact.minutes', 30);
});

test('a lead left 30 minutes without contact alerts the contact address once, with a toast for its assignee', function (): void {
    $camille = User::factory()->create();
    $waiting = Lead::factory()->create(['created_at' => now()->subMinutes(31), 'last_contacted_at' => null, 'assigned_to' => $camille->id]);
    Lead::factory()->create(['created_at' => now()->subMinutes(10), 'last_contacted_at' => null]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => now()->subMinutes(50)]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'status' => LeadStatus::InProgress]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'first_contact_alerted_at' => now()->subMinutes(20)]);

    expect((new AlertFirstContactOverdue)->handle())->toBe(1);

    Mail::assertSentCount(1);
    Mail::assertSent(FirstContactOverdue::class, fn (FirstContactOverdue $mail): bool => $mail->hasTo('contact@example.com')
        && $mail->lead->is($waiting) && $mail->minutes === 30);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['id'] === $waiting->id
        && $event->payload['mentions'] === [$camille->id]
        && $event->actor === null
        && str_contains((string) $event->message, 'sans contact depuis 30 min'));
    expect($waiting->fresh()?->first_contact_alerted_at)->not->toBeNull();

    // Un second passage ne renvoie rien.
    expect((new AlertFirstContactOverdue)->handle())->toBe(0);
    Mail::assertSentCount(1);
});

test('nothing is sent without an alert address', function (): void {
    config()->set('company.first_contact.alert_email', '');
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null]);

    expect((new AlertFirstContactOverdue)->handle())->toBe(0);
    Mail::assertNothingSent();
});

test('the alert e-mail names the lead, its reference and links to its page', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'reference' => 'LD-1234', 'assigned_to' => null, 'phone' => '+33 6 12 34 56 78']);

    $mail = new FirstContactOverdue($lead, 30);
    $html = $mail->render();

    expect($mail->envelope()->subject)->toContain('Léa Durand')->toContain('30 min')
        ->and($html)->toContain('Léa Durand')->toContain('LD-1234')->toContain('Non attribué')
        ->toContain('+33 6 12 34 56 78')->toContain(route('leads.show', $lead))
        ->not->toContain('staff');
});
