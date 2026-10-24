<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Mail\CompanyFollowUp;
use App\Models\Company;
use App\Models\CompanyContact;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

test('a member sends a free follow-up e-mail to the company and its contacts, one per person, in the advisor name', function (): void {
    config()->set('company.mail.sender_domains', ['relocation-in-paris.fr']);
    $advisor = User::factory()->create(['name' => 'Charles', 'email' => 'charles@relocation-in-paris.fr']);
    $company = Company::factory()->create(['name' => 'Zen Conseil', 'email' => 'rh@zen.example']);
    $marie = CompanyContact::factory()->primary()->for($company)->create(['first_name' => 'Marie', 'last_name' => 'Durand', 'email' => 'marie@zen.example']);

    $this->actingAs($advisor)
        ->post(route('companies.follow-up', $company), [
            'emails' => ['rh@zen.example', 'marie@zen.example'],
            'subject' => 'Point sur vos arrivées de janvier',
            'message' => "Bonjour,\n\nOù en êtes-vous des trois arrivées prévues ?\n\nBien à vous",
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Mail::assertQueuedCount(2);
    Mail::assertQueued(CompanyFollowUp::class, fn (CompanyFollowUp $mail): bool => $mail->hasTo('marie@zen.example')
        && $mail->recipientName === $marie->fullName()
        && $mail->subjectLine === 'Point sur vos arrivées de janvier'
        && ($mail->from[0]['address'] ?? null) === 'charles@relocation-in-paris.fr'
        && ($mail->replyTo[0]['address'] ?? null) === 'charles@relocation-in-paris.fr'
        && $mail->paragraphs() === ['Bonjour,', 'Où en êtes-vous des trois arrivées prévues ?', 'Bien à vous']);
    Mail::assertQueued(CompanyFollowUp::class, fn (CompanyFollowUp $mail): bool => $mail->hasTo('rh@zen.example') && $mail->recipientName === 'Zen Conseil');

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'companies'
        && ($event->payload['id'] ?? null) === $company->id
        && str_contains((string) $event->message, 'Point sur vos arrivées de janvier')
        && str_contains((string) $event->message, 'Marie Durand'));
});

test('the e-mail only goes to addresses the company already has, with a subject and a message', function (): void {
    $company = Company::factory()->create(['email' => 'rh@zen.example']);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('companies.follow-up', $company), ['emails' => ['pirate@evil.example'], 'subject' => 'Objet', 'message' => 'Un message assez long.'])
        ->assertSessionHasErrors(['emails.0']);

    $this->actingAs($member)
        ->post(route('companies.follow-up', $company), ['emails' => ['rh@zen.example'], 'subject' => 'Ok', 'message' => 'court'])
        ->assertSessionHasErrors(['subject', 'message']);

    Mail::assertNothingQueued();
});

test('a member who can only read the companies section cannot send a follow-up', function (): void {
    $company = Company::factory()->create(['email' => 'rh@zen.example']);
    $reader = User::factory()->create(['permissions' => [SiteSection::Companies->value => 'read']]);

    $this->actingAs($reader)
        ->post(route('companies.follow-up', $company), ['emails' => ['rh@zen.example'], 'subject' => 'Objet du mail', 'message' => 'Un message assez long.'])
        ->assertForbidden();

    Mail::assertNothingQueued();
});
