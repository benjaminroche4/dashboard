<?php

declare(strict_types=1);

use App\Enums\ClientPriority;
use App\Events\DashboardUpdated;
use App\Http\Controllers\Tools\ActivityController;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia;

test('a dispatched DashboardUpdated is recorded with its actor and its lead', function (): void {
    $actor = User::factory()->create(['name' => 'Chloé Martin']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($actor);
    event(new DashboardUpdated('leads', ['id' => $lead->id], 'a créé le lead Léa Durand'));

    $activity = Activity::query()->sole();
    expect($activity->resource)->toBe('leads')
        ->and($activity->message)->toBe('a créé le lead Léa Durand')
        ->and($activity->user_id)->toBe($actor->id)
        ->and($activity->lead_id)->toBe($lead->id)
        ->and($activity->payload)->toBe(['id' => $lead->id]);
});

test('an action of the backoffice leaves an activity behind it', function (): void {
    $admin = User::factory()->admin()->create();
    $lead = Lead::factory()->converted()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($admin)
        ->patch(route('clients.priority', $lead), ['priority' => ClientPriority::High->value])
        ->assertRedirect();

    $activity = Activity::query()->sole();
    expect($activity->resource)->toBe('clients')
        ->and($activity->user_id)->toBe($admin->id)
        ->and($activity->lead_id)->toBe($lead->id)
        ->and($activity->message)->toContain('Léa Durand');
});

test('an event without message and one about an unknown lead are handled safely', function (): void {
    event(new DashboardUpdated('leads', ['id' => 1]));
    event(new DashboardUpdated('leads', ['id' => 999_999], 'a supprimé le lead Léa Durand'));

    $activity = Activity::query()->sole();
    expect($activity->lead_id)->toBeNull()
        ->and($activity->user_id)->toBeNull()
        ->and($activity->message)->toBe('a supprimé le lead Léa Durand');
});

test('guests are redirected to the login page', function (): void {
    $this->get(route('tools.activity.index'))->assertRedirect(route('login'));
});

test('the journal lists the activities, newest first, with their actor, resource label and lead', function (): void {
    Date::setTestNow('2026-09-08 10:00:00');
    $member = User::factory()->create(['name' => 'Chloé Martin']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);
    Activity::factory()->resource('invoices', 'a créé la facture RP-27001')->create(['created_at' => now()->subDay()]);
    Activity::factory()->resource('leads', 'a créé le lead Léa Durand')->create(['user_id' => $member->id, 'lead_id' => $lead->id, 'created_at' => now()]);

    $this->actingAs($member)
        ->get(route('tools.activity.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('tools/activity')
            ->has('activities.data', 2)
            ->where('activities.total', 2)
            ->where('activities.current_page', 1)
            ->where('activities.last_page', 1)
            ->where('activities.prev_page_url', null)
            ->where('activities.next_page_url', null)
            ->where('activities.data.0.message', 'a créé le lead Léa Durand')
            ->where('activities.data.0.actor.name', 'Chloé Martin')
            ->where('activities.data.0.resource_label', 'Leads')
            ->where('activities.data.0.lead.uuid', $lead->uuid)
            ->where('activities.data.0.lead.name', 'Léa Durand')
            ->where('activities.data.0.created_at', now()->toIso8601String())
            ->where('activities.data.1.actor', null)
            ->where('activities.data.1.resource_label', 'Factures')
            ->where('activities.data.1.lead', null)
            ->where('members.0.name', 'Chloé Martin')
            ->where('resources', [['value' => 'invoices', 'label' => 'Factures'], ['value' => 'leads', 'label' => 'Leads']])
            ->where('filters', ['member' => null, 'resource' => null, 'lead' => null])
            ->where('lead', null));
});

test('the journal filters by member, resource and lead', function (): void {
    $member = User::factory()->create();
    $other = User::factory()->create();
    $lead = Lead::factory()->create();
    Activity::factory()->resource('leads', 'a créé le lead')->create(['user_id' => $member->id, 'lead_id' => $lead->id]);
    Activity::factory()->resource('invoices', 'a créé la facture')->create(['user_id' => $other->id]);
    Activity::factory()->resource('quotes', 'a envoyé le devis')->create(['user_id' => $member->id]);

    $this->actingAs($member)
        ->get(route('tools.activity.index', ['member' => $member->id]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities.data', 2)
            ->where('filters.member', $member->id));

    $this->actingAs($member)
        ->get(route('tools.activity.index', ['resource' => 'invoices']))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities.data', 1)
            ->where('activities.data.0.message', 'a créé la facture')
            ->where('filters.resource', 'invoices'));

    $this->actingAs($member)
        ->get(route('tools.activity.index', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities.data', 1)
            ->where('activities.data.0.message', 'a créé le lead')
            ->where('lead.uuid', $lead->uuid)
            ->where('filters.lead', $lead->uuid));

    $this->actingAs($member)
        ->get(route('tools.activity.index', ['member' => 'abc']))
        ->assertSessionHasErrors('member');
});

test('the journal paginates fifty entries per page keeping the filters', function (): void {
    $member = User::factory()->create();
    Activity::factory()->count(ActivityController::PER_PAGE + 1)->create(['user_id' => $member->id]);

    $this->actingAs($member)
        ->get(route('tools.activity.index', ['member' => $member->id]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities.data', ActivityController::PER_PAGE)
            ->where('activities.last_page', 2)
            ->where('activities.total', ActivityController::PER_PAGE + 1)
            ->where('activities.next_page_url', fn (string $url): bool => str_contains($url, 'page=2') && str_contains($url, "member={$member->id}")));

    $this->actingAs($member)
        ->get(route('tools.activity.index', ['page' => 2]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('activities.data', 1)
            ->where('activities.current_page', 2)
            ->where('activities.next_page_url', null)
            ->where('activities.prev_page_url', fn (string $url): bool => str_contains($url, 'page=1')));
});

test('the client file carries the ten latest activities of its lead', function (): void {
    $member = User::factory()->create();
    $lead = Lead::factory()->converted()->create();
    $other = Lead::factory()->create();
    Activity::factory()->count(12)->create(['lead_id' => $lead->id, 'resource' => 'clients']);
    Activity::factory()->create(['lead_id' => $other->id, 'resource' => 'leads']);

    $this->actingAs($member)
        ->get(route('clients.show', $lead))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('clients/show')
            ->has('activities', 10)
            ->where('activities.0.lead.uuid', $lead->uuid)
            ->where('activities.0.resource_label', 'Dossiers'));
});
