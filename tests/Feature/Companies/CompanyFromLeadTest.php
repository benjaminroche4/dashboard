<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('the company of a lead joins the directory once, the lead is attached and its page knows it', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'company' => 'Nestlé']);

    $this->actingAs($member)
        ->post(route('companies.from-lead', $lead))
        ->assertRedirect();

    $company = Company::query()->sole();
    expect($company->name)->toBe('Nestlé')
        ->and($lead->fresh()?->company_id)->toBe($company->id)
        ->and($lead->notes()->count())->toBe(1);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'companies'
        && $event->message === "a rattaché le lead Léa Durand à l'entreprise Nestlé");

    // Un second appel ne crée pas de doublon.
    $this->actingAs($member)->post(route('companies.from-lead', $lead))->assertRedirect(route('companies.show', $company));
    expect(Company::query()->count())->toBe(1);

    // La fiche du lead sait qu'elle existe.
    $this->actingAs($member)
        ->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('directoryCompany.uuid', $company->uuid));
});

test('an existing company with the same name is reused rather than duplicated', function (): void {
    $company = Company::factory()->create(['name' => 'Nestlé']);
    $lead = Lead::factory()->create(['company' => 'nestlé ']);

    $this->actingAs(User::factory()->create())->post(route('companies.from-lead', $lead))->assertRedirect(route('companies.show', $company));

    expect(Company::query()->count())->toBe(1)
        ->and($lead->fresh()?->company_id)->toBe($company->id);
});

test('a lead without a company cannot be added, and a member who cannot write companies is refused', function (): void {
    $lead = Lead::factory()->create(['company' => null]);
    $this->actingAs(User::factory()->create())->post(route('companies.from-lead', $lead))->assertSessionHasErrors('company');
    expect(Company::query()->count())->toBe(0);

    $named = Lead::factory()->create(['company' => 'Nestlé']);
    $reader = User::factory()->create(['role' => 'member', 'permissions' => [SiteSection::Companies->value => 'read']]);
    $this->actingAs($reader)->post(route('companies.from-lead', $named))->assertForbidden();
});
