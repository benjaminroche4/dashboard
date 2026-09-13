<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('the menu receives the number of leads still to handle', function (): void {
    Lead::factory()->count(2)->status(LeadStatus::Todo)->create();
    Lead::factory()->rentalManagement()->create();
    Lead::factory()->rentalManagement()->status(LeadStatus::InProgress)->create();
    Lead::factory()->status(LeadStatus::InProgress)->create();
    Lead::factory()->converted()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            // Chaque badge compte son segment : les deux leads locataires à
            // traiter d'un côté, le lead propriétaire de l'autre.
            ->where('counts.leadsTodo', 2)
            ->where('counts.ownerLeadsTodo', 1));
});
