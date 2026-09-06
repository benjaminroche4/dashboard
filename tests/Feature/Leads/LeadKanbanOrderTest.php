<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

function columnOrder(LeadStatus $status): array
{
    return Lead::query()->where('status', $status)->orderBy('position')->pluck('id')->all();
}

test('a new lead lands on top of the todo column', function (): void {
    $older = Lead::factory()->create(['position' => 0]);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.store'), ['first_name' => 'Ana', 'last_name' => 'Silva', 'email' => 'ana@example.com']);

    $order = columnOrder(LeadStatus::Todo);
    expect($order)->toHaveCount(2)->and($order[1])->toBe($older->id);
});

test('moving a lead reorders both columns and logs the status change', function (): void {
    $user = User::factory()->create();
    [$a, $b, $c] = Lead::factory()->count(3)->sequence(['position' => 0], ['position' => 1], ['position' => 2])->create();
    [$x, $y] = Lead::factory()->count(2)->status(LeadStatus::InProgress)->sequence(['position' => 0], ['position' => 1])->create();

    // b passe en « En cours » entre x et y.
    $this->actingAs($user)
        ->patch(route('leads.status', $b), ['status' => 'in_progress', 'position' => 1])
        ->assertRedirect();

    expect(columnOrder(LeadStatus::Todo))->toBe([$a->id, $c->id])
        ->and(columnOrder(LeadStatus::InProgress))->toBe([$x->id, $b->id, $y->id])
        ->and($b->fresh()?->statusChanges()->count())->toBe(1);

    // c remonte en tête de sa propre colonne : pas d'entrée d'historique.
    $this->actingAs($user)->patch(route('leads.status', $c), ['status' => 'todo', 'position' => 0]);

    expect(columnOrder(LeadStatus::Todo))->toBe([$c->id, $a->id])
        ->and($c->fresh()?->statusChanges()->count())->toBe(0);
});

test('without a position a status change puts the lead on top of its new column', function (): void {
    Lead::factory()->status(LeadStatus::Archived)->create(['position' => 0]);
    $lead = Lead::factory()->create();

    $this->actingAs(User::factory()->create())->patch(route('leads.status', $lead), ['status' => 'archived', 'loss_reason' => 'no_answer']);

    expect(columnOrder(LeadStatus::Archived)[0])->toBe($lead->id);
});
