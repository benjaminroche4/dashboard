<?php

declare(strict_types=1);

use App\Enums\MandateType;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Http::fake();
});

test('a field of the agency is edited in place, the others untouched, nothing broadcast without a change', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais', 'phone' => '+33 1 00 00 00 00', 'email' => 'contact@marais.fr', 'notes' => null]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('agencies.fields', $agency), ['phone' => ' +33 1 42 00 00 00 ', 'notes' => 'Ouverte le samedi.'])
        ->assertRedirect();

    $fresh = $agency->fresh();
    expect($fresh?->phone)->toBe('+33 1 42 00 00 00')
        ->and($fresh?->notes)->toBe('Ouverte le samedi.')
        ->and($fresh?->email)->toBe('contact@marais.fr');
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->message === "a modifié le téléphone, les notes de l'agence Agence du Marais");

    Event::fake([DashboardUpdated::class]);
    $this->actingAs($user)
        ->patch(route('agencies.fields', $agency), ['notes' => 'Ouverte le samedi.'])
        ->assertRedirect();
    Event::assertNotDispatched(DashboardUpdated::class);
});

test('the matching profile is edited line by line: lists, rents, fees and tri-state answers', function (): void {
    $agency = Agency::factory()->create(['name' => 'Agence du Marais', 'districts' => null, 'mandate_types' => null, 'accepts_garantme' => null, 'rent_min_cents' => null]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('agencies.fields', $agency), [
            'districts' => [11, 3],
            'mandate_types' => [MandateType::cases()[0]->value],
            'rent_min_cents' => 120000,
            'fee_note' => 'Un mois de loyer',
            'accepts_garantme' => true,
        ])
        ->assertRedirect();
    $fresh = $agency->fresh();
    expect($fresh?->districts)->toBe([11, 3])
        ->and($fresh?->mandate_types?->first())->toBe(MandateType::cases()[0])
        ->and($fresh?->rent_min_cents)->toBe(120000)
        ->and($fresh?->fee_note)->toBe('Un mois de loyer')
        ->and($fresh?->accepts_garantme)->toBeTrue();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'les quartiers') && str_contains($event->message, 'Garantme'));

    $this->actingAs($user)
        ->patch(route('agencies.fields', $agency), ['accepts_garantme' => null, 'districts' => []])
        ->assertRedirect();
    $fresh = $agency->fresh();
    expect($fresh?->accepts_garantme)->toBeNull()
        ->and($fresh?->districts)->toBeNull();

    $this->actingAs($user)
        ->from(route('agencies.show', $agency))
        ->patch(route('agencies.fields', $agency), ['website' => 'pas-une-url', 'districts' => [42]])
        ->assertSessionHasErrors(['website', 'districts.0']);
});
