<?php

declare(strict_types=1);

use App\Enums\LeadLanguage;
use App\Enums\PropertyType;
use App\Events\DashboardUpdated;
use App\Mail\LeadPropertyMatch;
use App\Models\Lead;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

test('the lead page counts the properties matching the search', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'budget_cents' => 200_000, 'districts' => [11], 'property_types' => [PropertyType::T2]]);
    Property::factory()->count(2)->create(['district' => 11, 'rent_cents' => 150_000, 'property_type' => PropertyType::T2]);
    Property::factory()->create(['district' => 16, 'rent_cents' => 900_000]);

    $this->actingAs($user)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('matchingCount', 2));
});

test('staff send the « n homes match » e-mail to the lead, in their language, and it is noted', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'first_name' => 'Léa', 'language' => LeadLanguage::English]);

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->post(route('leads.property-match', $lead), ['count' => 4])
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasNoErrors();

    Mail::assertQueued(LeadPropertyMatch::class, fn (LeadPropertyMatch $mail): bool => $mail->hasTo('lea@example.com')
        && $mail->count === 4
        && $mail->locale === 'en');
    expect($lead->notes()->first()?->body)->toContain('4 biens correspondants');
    expect($lead->fresh()?->last_contacted_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'a annoncé 4 biens correspondants'));
});

test('the e-mail leads with the number and invites to contact the advisor', function (): void {
    $advisor = User::factory()->create(['name' => 'Charles Petit', 'phone' => '+33 6 12 34 56 78']);
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'first_name' => 'Léa', 'language' => LeadLanguage::French, 'assigned_to' => $advisor->id]);

    $mail = new LeadPropertyMatch($lead, 4);
    $html = $mail->render();

    expect($mail->subjectLine(true))->toBe('Léa, 4 biens correspondent à votre recherche à Paris');
    expect($html)
        ->toContain('4 biens correspondent à votre recherche')
        ->toContain('Bonjour Léa')
        ->toContain('Ce que nous faisons pour vous')
        ->toContain('Contacter mon conseiller')
        ->toContain('appelez Charles au +33 6 12 34 56 78');

    $one = new LeadPropertyMatch($lead, 1);
    expect($one->subjectLine(true))->toBe('Léa, un bien correspond à votre recherche à Paris');
    expect($one->render())->toContain('bien qui correspond à votre recherche');
});

test('a lead without e-mail or a count out of range is refused', function (): void {
    $user = User::factory()->create();
    $noEmail = Lead::factory()->create(['email' => null, 'phone' => '+33 6 00 00 00 00']);
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);

    $this->actingAs($user)->from(route('leads.show', $noEmail))
        ->post(route('leads.property-match', $noEmail), ['count' => 2])
        ->assertSessionHasErrors('email');
    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.property-match', $lead), ['count' => 0])
        ->assertSessionHasErrors('count');
    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.property-match', $lead), ['count' => 51])
        ->assertSessionHasErrors('count');

    Mail::assertNothingQueued();
});
