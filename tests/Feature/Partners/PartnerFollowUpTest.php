<?php

declare(strict_types=1);

use App\Enums\ContactFunction;
use App\Enums\RelationshipQuality;
use App\Events\DashboardUpdated;
use App\Http\Controllers\Partners\PartnerController;
use App\Mail\DirectoryWelcome;
use App\Models\Activity;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

test('a member notes an exchange with a partner', function (): void {
    $user = User::factory()->staff()->create();
    $partner = Partner::factory()->create();

    $this->actingAs($user)
        ->post(route('partners.contact', $partner), [])
        ->assertRedirect();

    expect($partner->refresh()->last_contacted_at)->not->toBeNull();

    $this->actingAs($user)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->whereNot('partner.last_contacted_at', null));
});

test('the quality of the relationship is recorded and shown', function (): void {
    $user = User::factory()->staff()->create();
    $partner = Partner::factory()->create();

    $this->actingAs($user)
        ->patch(route('partners.update', $partner), [
            'name' => $partner->name,
            'type' => $partner->type->value,
            'relationship_quality' => 'excellent',
        ])
        ->assertRedirect();

    expect($partner->refresh()->relationship_quality)->toBe(RelationshipQuality::Excellent);

    $this->actingAs($user)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partner.relationship_quality', 'excellent')
            ->where('partner.relationship_quality_label', 'Excellente'));
});

test('the welcome e-mail is sent again to the chosen addresses, and nowhere else', function (): void {
    Mail::fake();
    Event::fake([DashboardUpdated::class]);
    $user = User::factory()->staff()->create();
    $partner = Partner::factory()->create(['name' => 'Zen Assurances', 'email' => 'contact@zen.example']);
    $contact = PartnerContact::factory()->for($partner)->create(['first_name' => 'Marie', 'last_name' => 'Durand', 'email' => 'marie@zen.example']);

    // Un e-mail par personne, adressé à son nom.
    $this->actingAs($user)
        ->post(route('partners.welcome', $partner), ['emails' => [$partner->email, $contact->email]])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Mail::assertQueuedCount(2);
    Mail::assertQueued(DirectoryWelcome::class, fn (DirectoryWelcome $mail): bool => $mail->hasTo('contact@zen.example'));
    Mail::assertQueued(DirectoryWelcome::class, function (DirectoryWelcome $mail) use ($partner): bool {
        $html = $mail->render();

        // Ce qui est enregistré tient sur une ligne, catégorie comprise ; ni
        // libellé « Votre contact », ni invitation à signaler une erreur.
        return $mail->hasTo('marie@zen.example')
            && str_contains($html, "partenaire · {$partner->type->label()}")
            && ! str_contains($html, 'Une erreur ?')
            && ! str_contains($html, 'Votre contact');
    });

    // Et le renvoi laisse une trace : sans elle, rien ne distingue à l'écran un
    // envoi réussi d'un bouton qui n'aurait rien fait.
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'partners'
        && str_contains((string) $event->message, "a renvoyé l'e-mail de bienvenue à"));

    // Une adresse étrangère au partenaire est refusée, même valide.
    $this->actingAs($user)
        ->post(route('partners.welcome', $partner), ['emails' => ['ailleurs@example.com']])
        ->assertSessionHasErrors('emails.0');

    // Et il faut au moins un destinataire.
    $this->actingAs($user)
        ->post(route('partners.welcome', $partner), ['emails' => []])
        ->assertSessionHasErrors('emails');

    Mail::assertQueuedCount(2);
});

test('a contact carries a function from the closed list and can be the primary one', function (): void {
    $user = User::factory()->staff()->create();
    $partner = Partner::factory()->create();
    $first = PartnerContact::factory()->for($partner)->create(['is_primary' => true]);

    $this->actingAs($user)
        ->post(route('partners.contacts.store', $partner), [
            'first_name' => 'marie',
            'last_name' => 'durand',
            'position' => 'sales',
            'is_primary' => true,
        ])
        ->assertRedirect();

    $contact = PartnerContact::query()->where('first_name', 'Marie')->firstOrFail();
    expect($contact->position)->toBe(ContactFunction::Sales)
        ->and($contact->is_primary)->toBeTrue()
        // Un seul principal : le précédent perd l'étiquette.
        ->and($first->refresh()->is_primary)->toBeFalse();

    $this->actingAs($user)
        ->post(route('partners.contacts.store', $partner), ['first_name' => 'Jo', 'last_name' => 'Doe', 'position' => 'inconnu'])
        ->assertSessionHasErrors('position');

    $this->actingAs($user)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partner.primary_contact.name', 'Marie Durand')
            ->has('partner.contacts', 2));

    // La fonction sort en libellé et en valeur, comme pour les agents.
    $serialised = collect(PartnerController::summary($partner->refresh()->load('contacts'))['contacts'])
        ->firstWhere('name', 'Marie Durand');
    expect($serialised['position'])->toBe('Commercial')
        ->and($serialised['position_value'])->toBe('sales');
});

test('the partner page carries its duplicates, its roles and its own journal', function (): void {
    $user = User::factory()->staff()->create();
    $partner = Partner::factory()->create(['email' => 'contact@zen.example']);
    Partner::factory()->create(['name' => 'Zen bis', 'email' => 'Contact@Zen.example']);
    Activity::factory()->create(['partner_id' => $partner->id, 'resource' => 'partners', 'message' => 'a noté un échange']);
    Activity::factory()->create(['resource' => 'leads', 'message' => 'ailleurs']);

    $this->actingAs($user)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('duplicates', 1)
            ->where('duplicates.0.name', 'Zen bis')
            ->has('activities', 1)
            ->where('activities.0.message', 'a noté un échange')
            ->has('functions')
            ->has('qualities'));
});

test('an action on a partner is journalised on that partner', function (): void {
    $user = User::factory()->staff()->create();
    $partner = Partner::factory()->create();

    $this->actingAs($user)->post(route('partners.contact', $partner))->assertRedirect();

    $activity = Activity::query()->where('resource', 'partners')->latest('id')->firstOrFail();
    expect($activity->partner_id)->toBe($partner->id);
});
