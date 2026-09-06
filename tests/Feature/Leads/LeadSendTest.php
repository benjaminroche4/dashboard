<?php

declare(strict_types=1);

use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Mail\LeadDossierSent;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
    Http::fake();
});

test('the lead page says what can be sent, with the payment plans of the offer', function (): void {
    config()->set('services.yousign.api_key');
    $confie = Lead::factory()->create(['email' => 'lea@example.com', 'offer' => Offer::Confie]);
    $accompagne = Lead::factory()->create(['email' => 'max@example.com', 'offer' => Offer::Accompagne]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('leads.show', $confie))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('sending.email', true)
            ->where('sending.paymentLink', true)
            ->where('sending.contractLink', false)
            ->has('sending.paymentPlans', 2)
            ->where('sending.paymentPlans.1.value', 'deposit'));

    $this->actingAs($user)
        ->get(route('leads.show', $accompagne))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('sending.paymentPlans', 1));
});

test('the deposit plan is sent with the payment link', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'offer' => Offer::Confie, 'language' => LeadLanguage::French]);

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->post(route('leads.send', $lead), ['items' => ['payment_link'], 'payment_plan' => 'deposit'])
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasNoErrors();

    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->paymentUrl === 'https://payment.relocation-in-paris.fr/b/aFa14p9h15dVfOD9HG7EQ0x');

    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.send', $lead), ['items' => ['payment_link'], 'payment_plan' => 'monthly'])
        ->assertSessionHasErrors('payment_plan');
});

test('staff can send the recap to the lead from the page', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);

    $this->actingAs($user)
        ->from(route('leads.show', $lead))
        ->post(route('leads.send', $lead), ['items' => ['recap']])
        ->assertRedirect(route('leads.show', $lead))
        ->assertSessionHasNoErrors();

    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->hasTo('lea@example.com'));
    expect($lead->notes()->count())->toBe(1);
});

test('the selection is validated and a missing e-mail is reported', function (): void {
    $user = User::factory()->create();
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);

    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.send', $lead), ['items' => []])
        ->assertSessionHasErrors('items');
    $this->actingAs($user)->from(route('leads.show', $lead))
        ->post(route('leads.send', $lead), ['items' => ['fax']])
        ->assertSessionHasErrors('items.0');

    $noEmail = Lead::factory()->create(['email' => null, 'phone' => '+33 6 00 00 00 00']);
    $this->actingAs($user)->from(route('leads.show', $noEmail))
        ->post(route('leads.send', $noEmail), ['items' => ['recap']])
        ->assertSessionHasErrors('email');

    Mail::assertNothingSent();
});

test('guests cannot send anything', function (): void {
    $lead = Lead::factory()->create();

    $this->post(route('leads.send', $lead), ['items' => ['recap']])->assertRedirect(route('login'));
});
