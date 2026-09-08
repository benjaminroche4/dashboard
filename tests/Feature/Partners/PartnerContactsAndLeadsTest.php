<?php

declare(strict_types=1);

use App\Enums\PartnerRole;
use App\Events\DashboardUpdated;
use App\Mail\LeadDossierForwarded;
use App\Models\Lead;
use App\Models\LeadPartner;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

test('contacts are added, updated and removed on a partner, names capitalised', function (): void {
    $partner = Partner::factory()->create();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('partners.contacts.store', $partner), ['first_name' => 'marie', 'last_name' => 'DURAND', 'position' => 'Commerciale', 'email' => 'marie@zen.example'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $contact = $partner->contacts()->firstOrFail();
    expect($contact->fullName())->toBe('Marie Durand');

    $this->actingAs($member)
        ->patch(route('partners.contacts.update', [$partner, $contact]), ['first_name' => 'Marie', 'last_name' => 'Durand-Roux', 'email' => 'nope'])
        ->assertSessionHasErrors(['email']);

    $this->actingAs($member)
        ->patch(route('partners.contacts.update', [$partner, $contact]), ['first_name' => 'Marie', 'last_name' => 'Durand-Roux'])
        ->assertRedirect();
    expect($contact->refresh()->last_name)->toBe('Durand-Roux');

    // Un contact d'un autre partenaire n'est pas accessible via cette URL.
    $other = PartnerContact::factory()->for(Partner::factory())->create();
    $this->actingAs($member)->delete(route('partners.contacts.destroy', [$partner, $other]))->assertNotFound();

    $this->actingAs($member)->delete(route('partners.contacts.destroy', [$partner, $contact]))->assertRedirect();
    expect($partner->contacts()->count())->toBe(0);

    $this->actingAs($member)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->has('partner.contacts', 0)->has('partner.leads', 0));
});

test('a partner is attached to a lead with a role, once per role, then detached', function (): void {
    $lead = Lead::factory()->create();
    $partner = Partner::factory()->create(['name' => 'Zen Assurances']);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('leads.partners.store', $lead), ['partner_id' => $partner->id, 'role' => 'home_insurance', 'note' => 'Devis demandé'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $link = $lead->partnerLinks()->firstOrFail();
    expect($link->role)->toBe(PartnerRole::HomeInsurance)
        ->and($link->note)->toBe('Devis demandé')
        ->and($lead->notes()->pluck('body')->join(' '))->toContain('Partenaire ajouté : Zen Assurances (Assurance habitation)');

    $this->actingAs($member)
        ->post(route('leads.partners.store', $lead), ['partner_id' => $partner->id, 'role' => 'home_insurance'])
        ->assertSessionHasErrors(['partner_id']);

    $this->actingAs($member)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('partners', 1)
            ->where('partners.0.partner.name', 'Zen Assurances')
            ->where('partners.0.role_label', 'Assurance habitation')
            ->has('partnerOptions', 1)
            ->has('partnerRoles', count(PartnerRole::cases())));

    $this->actingAs($member)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partner.leads.0.name', $lead->fullName())
            ->where('partner.leads.0.role_label', 'Assurance habitation')
            ->where('partner.leads_count', 1));

    // Un lien d'un autre lead ne peut pas être retiré via ce lead.
    $foreign = LeadPartner::query()->create(['lead_id' => Lead::factory()->create()->id, 'partner_id' => $partner->id, 'role' => 'moving']);
    $this->actingAs($member)->delete(route('leads.partners.destroy', [$lead, $foreign]))->assertNotFound();

    $this->actingAs($member)->delete(route('leads.partners.destroy', [$lead, $link]))->assertRedirect();
    expect($lead->partnerLinks()->count())->toBe(0);
});

test('the dossier is forwarded to the partner by e-mail, with the reply-to on the sender', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    $partner = Partner::factory()->create(['name' => 'Zen Assurances', 'email' => 'garantie@zen.example']);
    $link = LeadPartner::query()->create(['lead_id' => $lead->id, 'partner_id' => $partner->id, 'role' => 'guarantee']);
    $member = User::factory()->create(['email' => 'charles@relocation-in-paris.fr', 'name' => 'Charles']);

    $this->actingAs($member)
        ->post(route('leads.partners.forward', [$lead, $link]), ['email' => 'nope'])
        ->assertSessionHasErrors(['email']);
    // Jamais vers une adresse libre : le dossier contient les coordonnées et le projet du client.
    $this->actingAs($member)
        ->post(route('leads.partners.forward', [$lead, $link]), ['email' => 'perso@gmail.example'])
        ->assertSessionHasErrors(['email']);

    $this->actingAs($member)
        ->post(route('leads.partners.forward', [$lead, $link]), ['email' => 'garantie@zen.example', 'message' => 'Merci de traiter en priorité.'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Mail::assertSent(LeadDossierForwarded::class, fn (LeadDossierForwarded $mail): bool => $mail->hasTo('garantie@zen.example')
        && $mail->hasReplyTo('charles@relocation-in-paris.fr')
        && $mail->envelope()->subject === 'Dossier Léa Durand · Garantie'
        && str_contains($mail->render(), 'Merci de traiter en priorité.'));
    expect($lead->notes()->pluck('body')->join(' '))->toContain('Dossier transmis à Zen Assurances (Garantie) : garantie@zen.example');
});

test('partners are searchable by name, contact, e-mail or phone, and duplicates are found by name', function (): void {
    $partner = Partner::factory()->create(['name' => 'Zen Assurances', 'email' => 'contact@zen.example', 'phone' => '+33 1 42 00 11 22']);
    PartnerContact::factory()->for($partner)->create(['first_name' => 'Marie', 'last_name' => 'Durand', 'email' => 'marie@zen.example']);
    Partner::factory()->create(['name' => 'Alpha Gestion', 'email' => 'contact@alpha.example', 'phone' => '+33 1 00 00 00 00']);
    $user = User::factory()->create();

    $this->actingAs($user)->getJson(route('partners.search', ['q' => 'durand']))
        ->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Zen Assurances')->assertJsonPath('0.contact', 'Marie Durand');
    $this->actingAs($user)->getJson(route('partners.search', ['q' => 'alpha']))->assertJsonCount(1);
    $this->actingAs($user)->getJson(route('partners.search', ['q' => '']))->assertJsonCount(0);

    $this->actingAs($user)->getJson(route('partners.duplicates', ['name' => 'zen assurances']))
        ->assertJsonCount(1)->assertJsonPath('0.name', 'Zen Assurances');
    $this->actingAs($user)->getJson(route('partners.duplicates', ['name' => 'ze']))->assertJsonCount(0);
    $this->actingAs($user)->getJson(route('partners.duplicates', ['name' => 'zen assurances', 'except' => $partner->id]))->assertJsonCount(0);
});
