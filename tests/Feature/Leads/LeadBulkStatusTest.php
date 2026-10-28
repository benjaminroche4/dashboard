<?php

declare(strict_types=1);

use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('staff can move several leads to the same status at once', function (): void {
    $leads = Lead::factory()->count(3)->create(['status' => LeadStatus::Todo]);

    $this->actingAs(User::factory()->create())
        ->from(route('leads.index'))
        ->patch(route('leads.bulk-status'), ['ids' => $leads->pluck('id')->all(), 'status' => 'in_progress'])
        ->assertRedirect(route('leads.index'))
        ->assertSessionHas('inertia.flash_data', fn (array $flash): bool => $flash['toast']['type'] === 'success' && str_contains($flash['toast']['message'], '3 lead(s) passé(s) en « En cours »'));

    foreach ($leads as $lead) {
        expect($lead->fresh()?->status)->toBe(LeadStatus::InProgress)
            ->and($lead->statusChanges()->count())->toBe(1);
    }
    Event::assertDispatchedTimes(DashboardUpdated::class, 3);
});

test('archiving a group asks one loss reason and poses it on every lead', function (): void {
    $leads = Lead::factory()->count(2)->create(['status' => LeadStatus::InProgress]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => $leads->pluck('id')->all(), 'status' => 'archived'])
        ->assertSessionHasErrors('loss_reason');

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => $leads->pluck('id')->all(), 'status' => 'archived', 'loss_reason' => 'small_budget', 'loss_note' => 'Budget à 800 €'])
        ->assertSessionHasNoErrors();

    foreach ($leads as $lead) {
        expect($lead->fresh()?->status)->toBe(LeadStatus::Archived)
            ->and($lead->fresh()?->loss_reason)->toBe(LeadLossReason::SmallBudget)
            ->and($lead->fresh()?->loss_note)->toBe('Budget à 800 €');
    }
});

test('a lead already in the status is left alone and one without offer is skipped from « Converti »', function (): void {
    $ready = Lead::factory()->create(['status' => LeadStatus::QuoteSent, 'offer' => Offer::Confie]);
    $noOffer = Lead::factory()->create(['status' => LeadStatus::QuoteSent, 'offer' => null]);
    $already = Lead::factory()->converted()->create(['offer' => Offer::Confie]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => [$ready->id, $noOffer->id, $already->id], 'status' => 'converted'])
        ->assertSessionHas('inertia.flash_data', fn (array $flash): bool => $flash['toast']['type'] === 'warning'
            && str_contains($flash['toast']['message'], '1 lead(s) passé(s) en « Converti »')
            && str_contains($flash['toast']['message'], $noOffer->fullName()));

    expect($ready->fresh()?->status)->toBe(LeadStatus::Converted)
        ->and($noOffer->fresh()?->status)->toBe(LeadStatus::QuoteSent)
        ->and($already->fresh()?->status)->toBe(LeadStatus::Converted)
        ->and($already->statusChanges()->count())->toBe(0);
});

test('a member without write access to one of the leads is refused for the whole group', function (): void {
    $tenant = Lead::factory()->create();
    $owner = Lead::factory()->rentalManagement()->create();
    $member = User::factory()->create(['permissions' => [SiteSection::OwnerLeads->value => 'read']]);

    $this->actingAs($member)
        ->patch(route('leads.bulk-status'), ['ids' => [$tenant->id, $owner->id], 'status' => 'in_progress'])
        ->assertSessionHasErrors('ids');

    expect($tenant->fresh()?->status)->toBe(LeadStatus::Todo);
});

test('the request validates its shape', function (): void {
    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => [], 'status' => 'in_progress'])
        ->assertSessionHasErrors('ids');

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => [999999], 'status' => 'in_progress'])
        ->assertSessionHasErrors('ids.0');

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.bulk-status'), ['ids' => [Lead::factory()->create()->id], 'status' => 'vip'])
        ->assertSessionHasErrors('status');
});
