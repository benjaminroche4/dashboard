<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\CompanyContact;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the companies page lists every company sorted by name, with its contacts and its clients count', function (): void {
    $this->get(route('companies.index'))->assertRedirect(route('login'));

    $author = User::factory()->create(['name' => 'Admin']);
    $zen = Company::factory()->create(['name' => 'Zen Conseil', 'created_by' => $author->id]);
    Company::factory()->create(['name' => 'Alpha Industries']);
    CompanyContact::factory()->primary()->for($zen)->create(['first_name' => 'Marie', 'last_name' => 'Durand']);
    Lead::factory()->converted()->count(2)->create(['company_id' => $zen->id]);

    $this->actingAs($author)
        ->get(route('companies.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('companies/index')
            ->has('companies', 2)
            ->where('companies.0.name', 'Alpha Industries')
            ->where('companies.1.name', 'Zen Conseil')
            ->where('companies.1.clients_count', 2)
            ->where('companies.1.contacts.0.name', 'Marie Durand')
            ->where('companies.1.contacts.0.is_primary', true)
            ->where('companies.1.creator', 'Admin'));
});

test('a company has a detail page addressed by uuid, with its clients and the free dossiers to attach', function (): void {
    $company = Company::factory()->create(['name' => 'Zen Conseil']);
    $attached = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'company_id' => $company->id]);
    $free = Lead::factory()->converted()->create(['first_name' => 'Paul', 'last_name' => 'Martin']);
    Lead::factory()->create(['first_name' => 'Ana', 'last_name' => 'Lopez']); // en cours : pas un client

    $this->actingAs(User::factory()->create())
        ->get(route('companies.show', $company))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('companies/show')
            ->where('company.uuid', $company->uuid)
            ->has('company.clients', 1)
            ->where('company.clients.0.uuid', $attached->uuid)
            ->where('company.clients.0.name', 'Léa Durand')
            ->has('clientOptions', 1)
            ->where('clientOptions.0.id', $free->id)
            ->has('functions'));

    $this->actingAs(User::factory()->create())->get('/companies/'.$company->id)->assertNotFound();
});

test('any member creates and updates a company, the payload is validated, creation lands on the detail page', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('companies.store'), [
            'name' => '  Zen Conseil ',
            'email' => 'rh@zen.example',
            'phone' => '',
            'website' => 'https://zen.example',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('companies.show', Company::query()->firstOrFail()));

    $company = Company::query()->firstOrFail();

    expect($company->name)->toBe('Zen Conseil')
        ->and($company->phone)->toBeNull()
        ->and($company->created_by)->toBe($member->id);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'companies' && str_contains((string) $event->message, 'Zen Conseil'));

    $this->actingAs($member)
        ->patch(route('companies.update', $company), ['name' => '', 'website' => 'nope'])
        ->assertSessionHasErrors(['name', 'website']);

    $this->actingAs($member)
        ->patch(route('companies.update', $company), ['name' => 'Zen Conseil & Co', 'city' => 'Paris'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($company->refresh()->name)->toBe('Zen Conseil & Co')->and($company->city)->toBe('Paris');
});

test('only a member who manages the section deletes a company; its contacts go with it and its clients only lose the link', function (): void {
    $company = Company::factory()->create();
    CompanyContact::factory()->for($company)->create();
    $client = Lead::factory()->converted()->create(['company_id' => $company->id]);

    $this->actingAs(User::factory()->create(['role' => 'member']))
        ->delete(route('companies.destroy', $company))
        ->assertForbidden();

    $this->actingAs(User::factory()->create(['role' => 'admin']))
        ->delete(route('companies.destroy', $company))
        ->assertRedirect(route('companies.index'));

    $this->assertDatabaseMissing('companies', ['id' => $company->id]);
    $this->assertDatabaseCount('company_contacts', 0);
    expect($client->refresh()->company_id)->toBeNull();
});

test('several contacts of the same company can be primary, names are capitalised', function (): void {
    $company = Company::factory()->create();
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('companies.contacts.store', $company), ['first_name' => 'marie', 'last_name' => 'DURAND', 'position' => 'director', 'is_primary' => true, 'email' => 'marie@zen.example'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($member)
        ->post(route('companies.contacts.store', $company), ['first_name' => 'paul', 'last_name' => 'martin', 'is_primary' => true])
        ->assertSessionHasNoErrors();

    $this->actingAs($member)
        ->post(route('companies.contacts.store', $company), ['first_name' => '', 'last_name' => 'x', 'position' => 'ceo'])
        ->assertSessionHasErrors(['first_name', 'position']);

    $contacts = $company->contacts()->get();

    expect($contacts)->toHaveCount(2)
        ->and($contacts->where('is_primary', true))->toHaveCount(2)
        ->and($contacts->firstWhere('last_name', 'Durand')?->first_name)->toBe('Marie');

    $paul = $contacts->firstWhere('last_name', 'Martin');

    $this->actingAs($member)
        ->patch(route('companies.contacts.update', [$company, $paul]), ['first_name' => 'Paul', 'last_name' => 'Martin', 'is_primary' => false])
        ->assertSessionHasNoErrors();

    expect($paul->refresh()->is_primary)->toBeFalse()
        ->and($contacts->firstWhere('last_name', 'Durand')?->refresh()->is_primary)->toBeTrue();

    $this->actingAs($member)->delete(route('companies.contacts.destroy', [$company, $paul]))->assertRedirect();
    $this->assertDatabaseMissing('company_contacts', ['id' => $paul->id]);

    // Un contact d'une autre entreprise répond 404 sur cette fiche.
    $other = CompanyContact::factory()->for(Company::factory())->create();
    $this->actingAs($member)->delete(route('companies.contacts.destroy', [$company, $other]))->assertNotFound();
});

test('a client dossier is attached to a company, which fills its missing company name, then detached', function (): void {
    $company = Company::factory()->create(['name' => 'Zen Conseil']);
    $client = Lead::factory()->converted()->create(['company' => null]);
    $member = User::factory()->create();

    $this->actingAs($member)
        ->post(route('companies.clients.store', $company), ['lead_id' => $client->id])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($client->refresh()->company_id)->toBe($company->id)
        ->and($client->company)->toBe('Zen Conseil')
        ->and($client->notes()->where('body', 'like', '%rattaché à l\'entreprise Zen Conseil%')->exists())->toBeTrue();

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'companies' && ($event->payload['lead_id'] ?? null) === $client->id);

    $this->actingAs($member)
        ->delete(route('companies.clients.destroy', [$company, $client]))
        ->assertRedirect();

    expect($client->refresh()->company_id)->toBeNull();

    // Détacher un dossier qui n'est pas à cette entreprise répond 404.
    $this->actingAs($member)->delete(route('companies.clients.destroy', [$company, $client]))->assertNotFound();
});

test('only a client dossier can be attached: a lead in progress is refused', function (): void {
    $company = Company::factory()->create();
    $lead = Lead::factory()->status(LeadStatus::InProgress)->create();

    $this->actingAs(User::factory()->create())
        ->post(route('companies.clients.store', $company), ['lead_id' => $lead->id])
        ->assertSessionHasErrors(['lead_id']);

    $this->actingAs(User::factory()->create())
        ->post(route('companies.clients.store', $company), ['lead_id' => 999_999])
        ->assertSessionHasErrors(['lead_id']);

    expect($lead->refresh()->company_id)->toBeNull();
});

test('companies are searched by name, contact, e-mail or phone, eight at most', function (): void {
    $company = Company::factory()->create(['name' => 'Zen Conseil', 'email' => 'rh@zen.example']);
    CompanyContact::factory()->primary()->for($company)->create(['first_name' => 'Marie', 'last_name' => 'Durand']);
    Company::factory()->create(['name' => 'Alpha Industries', 'email' => 'rh@alpha.example', 'phone' => '+33 1 00 00 00 00']);

    $user = User::factory()->create();

    $this->actingAs($user)->getJson(route('companies.search', ['q' => 'z']))->assertOk()->assertExactJson([]);

    $this->actingAs($user)
        ->getJson(route('companies.search', ['q' => 'durand']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Zen Conseil')
        ->assertJsonPath('0.subtitle', 'Marie Durand')
        ->assertJsonPath('0.url', route('companies.show', $company));

    $this->actingAs(User::factory()->create(['permissions' => [SiteSection::Companies->value => 'none']]))
        ->getJson(route('companies.search', ['q' => 'zen']))
        ->assertForbidden();
});

test('a member whose companies section is closed cannot open the directory', function (): void {
    $member = User::factory()->create(['permissions' => [SiteSection::Companies->value => 'none']]);
    $company = Company::factory()->create();

    $this->actingAs($member)->get(route('companies.index'))->assertForbidden();
    $this->actingAs($member)->get(route('companies.show', $company))->assertForbidden();
});

test('the companies seeder attaches clients and gives the first company two primary contacts', function (): void {
    $this->seed();

    $first = Company::query()->oldest('id')->firstOrFail();

    expect(Company::query()->count())->toBe(4)
        ->and($first->contacts()->where('is_primary', true)->count())->toBe(2)
        ->and($first->clients()->count())->toBe(2)
        ->and(Lead::query()->whereNotNull('company_id')->count())->toBe(5);
});
