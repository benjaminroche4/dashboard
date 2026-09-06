<?php

declare(strict_types=1);

use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadStatus;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the converting machine page lists offers, sources and currencies', function (): void {
    $this->actingAs(User::factory()->create(['role' => StaffRole::Member]))
        ->get(route('leads.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('leads/create')
            ->has('offers', 2)
            ->has('sources', 5)
            ->has('currencies', 2)
            ->has('languages', 2)
            ->has('propertyTypes', 9)
            ->has('durations', 3)
            ->has('guarantors', 3)
            ->has('furnishedOptions', 3)
            ->has('recontactChannels', 4)
            ->where('defaultCurrency', 'EUR'));
});

test('any staff member can add a lead, which starts as new and is broadcast', function (): void {
    $user = User::factory()->create(['role' => StaffRole::Member]);

    $this->actingAs($user)
        ->post(route('leads.store'), [
            'first_name' => 'Léa',
            'last_name' => 'Durand',
            'email' => 'lea@example.com',
            'phone' => '',
            'offer' => 'confie',
            'arrival_at' => '2026-11-01',
            'budget_cents' => 250_000,
            'currency' => 'EUR',
            'origin_city' => 'Genève',
            'source' => 'referral',
            'message' => 'Arrive avec sa famille.',
            'score' => 4,
            'company' => 'Nestlé',
            'language' => 'en',
            'source_note' => 'Recommandée par un ancien client',
            'districts' => [3, 4, 11],
            'property_types' => ['t2', 't3'],
            'duration' => 'long',
            'guarantors' => ['garantme', 'bancaire'],
            'furnished' => 'furnished',
            'recontact_channel' => 'phone',
            'recontact_at' => '2026-09-10',
            'qualification_note' => 'Très motivée, budget solide.',
        ])
        ->assertRedirect(route('leads.index'));

    $lead = Lead::query()->sole();
    expect($lead->fullName())->toBe('Léa Durand')
        ->and($lead->status)->toBe(LeadStatus::Todo)
        ->and($lead->budget_cents)->toBe(250_000)
        ->and($lead->score)->toBe(4)
        ->and($lead->company)->toBe('Nestlé')
        ->and($lead->language)->toBe(LeadLanguage::English)
        ->and($lead->districts)->toBe([3, 4, 11])
        ->and($lead->property_types?->map(fn (PropertyType $type): string => $type->value)->all())->toBe(['t2', 't3'])
        ->and($lead->duration)->toBe(LeadDuration::Long)
        ->and($lead->guarantors?->all())->toBe([GuarantorType::Garantme, GuarantorType::Bank])
        ->and($lead->furnished)->toBe(Furnished::Furnished)
        ->and($lead->recontact_channel)->toBe(RecontactChannel::Phone)
        ->and($lead->recontact_at?->toDateString())->toBe('2026-09-10')
        ->and($lead->qualification_note)->toBe('Très motivée, budget solide.')
        ->and($lead->arrival_at?->toDateString())->toBe('2026-11-01')
        ->and($lead->created_by)->toBe($user->id);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'leads');
});

test('a lead needs a name and at least one way to reach it', function (): void {
    $this->actingAs(User::factory()->create())
        ->from(route('leads.create'))
        ->post(route('leads.store'), ['first_name' => '', 'last_name' => 'X', 'email' => '', 'phone' => ''])
        ->assertRedirect(route('leads.create'))
        ->assertSessionHasErrors(['first_name', 'email', 'phone']);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.store'), ['first_name' => 'A', 'last_name' => 'B', 'email' => 'a@b.fr', 'districts' => [0, 21], 'property_types' => ['villa']])
        ->assertSessionHasErrors(['districts.0', 'districts.1', 'property_types.0']);

    expect(Lead::query()->count())->toBe(0);
});

test('the lead name is capitalised on save', function (): void {
    Event::fake([DashboardUpdated::class]);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.store'), [
            'first_name' => 'jean-pierre',
            'last_name' => 'DE LA TOUR',
            'email' => 'jp@exemple.com',
            'language' => 'fr',
            'source' => 'website',
        ]);

    $lead = Lead::query()->latest('id')->firstOrFail();

    expect($lead->first_name)->toBe('Jean-Pierre')
        ->and($lead->last_name)->toBe('De La Tour');
});
