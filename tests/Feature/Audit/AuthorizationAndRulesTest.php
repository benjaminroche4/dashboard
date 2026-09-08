<?php

declare(strict_types=1);

use App\Actions\Documents\DeleteCatalogDocument;
use App\Actions\Leads\AddLeadNote;
use App\Actions\Owners\UpdateOwner;
use App\Data\OwnerData;
use App\Enums\OwnerStatus;
use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('only an administrator changes an e-mail address on a profile', function (): void {
    $member = User::factory()->create(['email' => 'chloe@relocation-in-paris.fr', 'name' => 'Chloé']);

    $this->actingAs($member)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), ['name' => 'Chloé', 'email' => 'direction@relocation-in-paris.fr'])
        ->assertSessionHasErrors(['email']);
    expect($member->fresh()->email)->toBe('chloe@relocation-in-paris.fr');

    $this->actingAs($member)
        ->patch(route('profile.update'), ['name' => 'Chloé Martin', 'email' => 'chloe@relocation-in-paris.fr'])
        ->assertSessionHasNoErrors();

    $admin = User::factory()->admin()->create(['email' => 'admin@relocation-in-paris.fr']);
    $this->actingAs($admin)
        ->patch(route('profile.update'), ['name' => 'Admin', 'email' => 'direction@relocation-in-paris.fr'])
        ->assertSessionHasNoErrors();
});

test('owner lead routes belong to the owner lead sections', function (): void {
    expect(SiteSection::forRoute('owners.leads.create'))->toBe([SiteSection::OwnerLeadsCreate])
        ->and(SiteSection::forRoute('owners.leads.store'))->toBe([SiteSection::OwnerLeadsCreate])
        ->and(SiteSection::forRoute('owners.leads.edit'))->toBe([SiteSection::OwnerLeads])
        ->and(SiteSection::forRoute('owners.leads'))->toBe([SiteSection::OwnerLeads])
        ->and(SiteSection::forRoute('owners.index'))->toBe([SiteSection::Owners]);

    $member = User::factory()->create(['permissions' => ['owner_leads_create' => 'none', 'owner_leads' => 'none']]);
    $this->actingAs($member)->get(route('owners.leads.create'))->assertForbidden();
    $this->actingAs($member)->get(route('owners.index'))->assertOk();
});

test('a lead policy follows the section of the lead: clients-only access does not edit open leads', function (): void {
    $member = User::factory()->create(['permissions' => ['leads' => 'none', 'owner_leads' => 'none', 'clients' => 'write']]);
    $open = Lead::factory()->create();
    $client = Lead::factory()->converted()->create();
    $ownerLead = Lead::factory()->rentalManagement()->create();

    expect($member->can('update', $open))->toBeFalse()
        ->and($member->can('view', $open))->toBeFalse()
        ->and($member->can('update', $client))->toBeTrue()
        ->and($member->can('update', $ownerLead))->toBeFalse();
});

test('an invoice refuses a deposit above its total, oversized lines and a non-web website', function (): void {
    $manager = User::factory()->manager()->create();
    $base = ['client_name' => 'Nestlé', 'currency' => 'EUR', 'vat_rate' => 8.1, 'issued_at' => '2026-09-01', 'due_at' => '2026-10-01'];

    $this->actingAs($manager)
        ->from(route('invoices.create'))
        ->post(route('invoices.store'), [...$base, 'deposit_cents' => 200_000, 'items' => [['offer' => 'accompagne', 'quantity' => 1, 'unit_price_cents' => 100_000]]])
        ->assertSessionHasErrors(['deposit_cents']);

    $this->actingAs($manager)
        ->from(route('invoices.create'))
        ->post(route('invoices.store'), [...$base, 'items' => [['offer' => 'accompagne', 'quantity' => 1e9, 'unit_price_cents' => 1]]])
        ->assertSessionHasErrors(['items.0.quantity']);

    $this->actingAs($manager)
        ->from(route('agencies.index'))
        ->post(route('agencies.store'), ['name' => 'Agence', 'website' => 'ftp://evil.example/x'])
        ->assertSessionHasErrors(['website']);
});

test('a catalog document still cited by a list cannot be deleted', function (): void {
    $document = CatalogDocument::factory()->create(['key' => 'passport']);
    DocumentRequest::factory()->create(['persons' => [['first_name' => 'Léa', 'last_name' => 'Durand', 'role' => 'tenant', 'documents' => ['passport']]]]);

    expect(fn () => (new DeleteCatalogDocument)->handle($document))->toThrow(ValidationException::class)
        ->and(CatalogDocument::query()->whereKey($document->id)->exists())->toBeTrue();
});

test('a mention needs a word boundary: @Admin 2 does not mention @Admin', function (): void {
    $admin = User::factory()->create(['name' => 'Admin']);
    $admin2 = User::factory()->create(['name' => 'Admin 2']);
    $author = User::factory()->create(['name' => 'Chloé']);

    expect(AddLeadNote::mentionedUserIds('Voir avec @Admin 2 demain', $author))->toBe([$admin2->id])
        ->and(AddLeadNote::mentionedUserIds('Voir avec @Admin, merci', $author))->toBe([$admin->id]);
});

test('a visit is only scheduled for a client and a new property needs the property right', function (): void {
    $member = User::factory()->create(['permissions' => ['properties' => 'read']]);
    $open = Lead::factory()->create();
    $client = Lead::factory()->converted()->create();

    $this->actingAs($member)
        ->from(route('clients.visits'))
        ->post(route('clients.visits.store'), ['lead_id' => $open->id, 'scheduled_at' => '2026-09-15 10:30', 'property' => ['street' => '12 rue Oberkampf', 'postal_code' => '75011']])
        ->assertSessionHasErrors(['lead_id']);

    $this->actingAs($member)
        ->post(route('clients.visits.store'), ['lead_id' => $client->id, 'scheduled_at' => '2026-09-15 10:30', 'property' => ['street' => '12 rue Oberkampf', 'postal_code' => '75011']])
        ->assertForbidden();
});

test('any owner status change out of « to contact » dates the last contact, and the first contact of a lead is kept', function (): void {
    $owner = Owner::factory()->create(['status' => OwnerStatus::Contacted, 'last_contacted_at' => null, 'first_name' => 'Ali', 'last_name' => 'Bensaïd', 'email' => 'ali@example.com']);
    (new UpdateOwner)->handle($owner, OwnerData::from([...$owner->only(['first_name', 'last_name', 'email', 'phone', 'company', 'street', 'postal_code', 'city', 'property_count', 'notes']), 'status' => 'interested']));
    expect($owner->fresh()->last_contacted_at)->not->toBeNull();

    $lead = Lead::factory()->create(['last_contacted_at' => null]);
    $lead->forceFill(['last_contacted_at' => '2026-09-01 10:00:00'])->save();
    $lead->forceFill(['last_contacted_at' => '2026-09-05 10:00:00'])->save();
    expect($lead->fresh()->first_contacted_at->toDateTimeString())->toBe('2026-09-01 10:00:00')
        ->and($lead->fresh()->last_contacted_at->toDateTimeString())->toBe('2026-09-05 10:00:00');
});
