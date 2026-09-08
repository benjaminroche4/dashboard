<?php

declare(strict_types=1);

use App\Actions\Leads\AlertFirstContactOverdue;
use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Mail\FirstContactOverdue;
use App\Mail\FirstContactOverdueForAssignee;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    config()->set('company.first_contact.alert_email', 'contact@example.com');
    config()->set('company.first_contact.minutes', 30);
    config()->set('services.allo.api_key');
    Http::fake();
});

test('a lead left 30 minutes without contact alerts the contact address once, with a toast for its assignee', function (): void {
    $camille = User::factory()->create();
    $waiting = Lead::factory()->create(['created_at' => now()->subMinutes(31), 'last_contacted_at' => null, 'assigned_to' => $camille->id]);
    Lead::factory()->create(['created_at' => now()->subMinutes(10), 'last_contacted_at' => null]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => now()->subMinutes(50)]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'status' => LeadStatus::InProgress]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'first_contact_alerted_at' => now()->subMinutes(20)]);

    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(1);

    Mail::assertSentCount(2);
    Mail::assertSent(FirstContactOverdue::class, fn (FirstContactOverdue $mail): bool => $mail->hasTo('contact@example.com')
        && $mail->lead->is($waiting) && $mail->minutes === 30);
    Mail::assertSent(FirstContactOverdueForAssignee::class, fn (FirstContactOverdueForAssignee $mail): bool => $mail->hasTo($camille->email)
        && $mail->lead->is($waiting) && $mail->assignee->is($camille));
    Http::assertNothingSent();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->payload['id'] === $waiting->id
        && $event->payload['mentions'] === [$camille->id]
        && $event->actor === null
        && str_contains((string) $event->message, 'sans contact depuis 30 min'));
    expect($waiting->fresh()?->first_contact_alerted_at)->not->toBeNull();

    // Un second passage ne renvoie rien.
    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(0);
    Mail::assertSentCount(2);
});

test('an assignee with a phone gets an SMS through Allo, plus the e-mails', function (): void {
    config()->set('services.allo.api_key', 'ak_test');
    config()->set('services.allo.from', '+33184804344');
    $charles = User::factory()->create(['name' => 'Charles Martin', 'phone' => '+33 6 12 34 56 78']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'reference' => 'LD-1234', 'created_at' => now()->subMinutes(45), 'last_contacted_at' => null, 'assigned_to' => $charles->id]);

    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(1);

    Mail::assertSent(FirstContactOverdue::class, fn (FirstContactOverdue $mail): bool => $mail->hasTo('contact@example.com'));
    Mail::assertSent(FirstContactOverdueForAssignee::class, fn (FirstContactOverdueForAssignee $mail): bool => $mail->hasTo($charles->email));
    Http::assertSentCount(1);
    Http::assertSent(fn ($request): bool => $request->url() === 'https://api.withallo.com/v1/api/sms'
        && $request->hasHeader('Authorization', 'Api-Key ak_test')
        && $request['from'] === '+33184804344'
        && $request['to'] === '+33612345678'
        && $request['message'] === 'Relocation in Paris : le lead Léa Durand (LD-1234) attend un premier contact depuis 30 min. '.route('leads.show', $lead));
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'et à Charles Martin'));
});

test('no SMS without a phone, and no HTTP call when Allo is not configured', function (): void {
    config()->set('services.allo.api_key', 'ak_test');
    config()->set('services.allo.from', '+33184804344');
    $noPhone = User::factory()->create(['phone' => null]);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'assigned_to' => $noPhone->id]);

    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(1);
    Mail::assertSent(FirstContactOverdueForAssignee::class, fn (FirstContactOverdueForAssignee $mail): bool => $mail->hasTo($noPhone->email));
    Http::assertNothingSent();

    config()->set('services.allo.api_key');
    $withPhone = User::factory()->create(['phone' => '+33 6 00 00 00 00']);
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'assigned_to' => $withPhone->id]);

    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(1);
    Mail::assertSent(FirstContactOverdueForAssignee::class, fn (FirstContactOverdueForAssignee $mail): bool => $mail->hasTo($withPhone->email));
    Http::assertNothingSent();
});

test('an unassigned lead only alerts the contact address', function (): void {
    config()->set('services.allo.api_key', 'ak_test');
    config()->set('services.allo.from', '+33184804344');
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null, 'assigned_to' => null]);

    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(1);

    Mail::assertSentCount(1);
    Mail::assertSent(FirstContactOverdue::class);
    Mail::assertNotSent(FirstContactOverdueForAssignee::class);
    Http::assertNothingSent();
});

test('the assignee e-mail greets the adviser by first name and links to the lead', function (): void {
    $charles = User::factory()->create(['name' => 'Charles Martin']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'reference' => 'LD-1234', 'assigned_to' => $charles->id]);

    $mail = new FirstContactOverdueForAssignee($lead, $charles, 32);
    $html = $mail->render();

    expect($mail->envelope()->subject)->toContain('Léa Durand')->toContain('32 min')
        ->and($html)->toContain('Bonjour Charles')->toContain('32 minutes')->toContain('LD-1234')
        ->toContain(route('leads.show', $lead))
        ->not->toContain('staff');
});

test('nothing is sent without an alert address', function (): void {
    config()->set('company.first_contact.alert_email', '');
    Lead::factory()->create(['created_at' => now()->subHour(), 'last_contacted_at' => null]);

    expect(resolve(AlertFirstContactOverdue::class)->handle())->toBe(0);
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
