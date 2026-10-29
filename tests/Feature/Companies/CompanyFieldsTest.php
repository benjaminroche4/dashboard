<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a field of the company is edited in place, the others untouched, nothing broadcast without a change', function (): void {
    $company = Company::factory()->create(['name' => 'Axa', 'phone' => '+33 1 00 00 00 00', 'email' => 'rh@axa.fr', 'notes' => null]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('companies.fields', $company), ['phone' => ' +33 1 42 00 00 00 ', 'notes' => 'Relogement de cadres.'])
        ->assertRedirect();

    $fresh = $company->fresh();
    expect($fresh?->phone)->toBe('+33 1 42 00 00 00')
        ->and($fresh?->notes)->toBe('Relogement de cadres.')
        ->and($fresh?->email)->toBe('rh@axa.fr');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a modifié le téléphone, les notes de l'entreprise Axa");

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($user)
        ->patch(route('companies.fields', $company), ['notes' => 'Relogement de cadres.'])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);

    $this->actingAs($user)
        ->from(route('companies.show', $company))
        ->patch(route('companies.fields', $company), ['website' => 'pas-une-url'])
        ->assertSessionHasErrors(['website']);
});
