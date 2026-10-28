<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the score and the qualification note are set in place from the fiche', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'score' => null, 'qualification_note' => null]);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.qualification.update', $lead), ['score' => 4, 'qualification_note' => '  Budget solide, arrive en mars.  '])
        ->assertRedirect();

    expect($lead->fresh()?->score)->toBe(4)
        ->and($lead->fresh()?->qualification_note)->toBe('Budget solide, arrive en mars.');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a noté le lead Léa Durand 4 / 5');
});

test('clearing the score and an unchanged qualification are handled quietly', function (): void {
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'score' => 3, 'qualification_note' => 'Ok']);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.qualification.update', $lead), ['score' => 3, 'qualification_note' => 'Ok'])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.qualification.update', $lead), ['score' => null, 'qualification_note' => ''])
        ->assertRedirect();

    expect($lead->fresh()?->score)->toBeNull()
        ->and($lead->fresh()?->qualification_note)->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === 'a retiré la note du lead Léa Durand');
});

test('the score stays between 1 and 5', function (): void {
    $lead = Lead::factory()->create();

    $this->actingAs(User::factory()->create())
        ->patch(route('leads.qualification.update', $lead), ['score' => 6])
        ->assertSessionHasErrors('score');
});
