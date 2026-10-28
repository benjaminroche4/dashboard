<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Storage::fake('public');
    Event::fake([DashboardUpdated::class]);
    Http::fake();
});

test('a member who can edit agencies uploads a logo, which replaces the previous file', function (): void {
    $agency = Agency::factory()->create(['name' => 'Century 21 Marais']);
    $user = User::factory()->create();

    $this->actingAs($user)->from(route('agencies.show', $agency))
        ->post(route('agencies.logo.update', $agency), ['logo' => UploadedFile::fake()->image('logo.png', 200, 200)])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('agencies.show', $agency));

    $first = $agency->refresh()->logo_path;
    expect($first)->toStartWith('agency-logos/')
        ->and($agency->logo)->not->toBeNull();
    Storage::disk('public')->assertExists($first);

    $this->actingAs($user)->post(route('agencies.logo.update', $agency), ['logo' => UploadedFile::fake()->image('new.webp', 100, 100)])
        ->assertSessionHasNoErrors();

    $second = $agency->refresh()->logo_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'agencies'
        && $event->message === "a changé le logo de l'agence Century 21 Marais");
});

test('the logo must be an image of at most 2 MB', function (): void {
    $agency = Agency::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('agencies.logo.update', $agency), ['logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('logo');
    $this->actingAs($user)->post(route('agencies.logo.update', $agency), ['logo' => UploadedFile::fake()->image('big.png')->size(3 * 1024)])
        ->assertSessionHasErrors('logo');

    expect($agency->refresh()->logo_path)->toBeNull();
});

test('the logo is removed with its file, and goes away with the agency', function (): void {
    Storage::disk('public')->put('agency-logos/a.png', 'png');
    $agency = Agency::factory()->create(['logo_path' => 'agency-logos/a.png']);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->delete(route('agencies.logo.destroy', $agency))->assertSessionHasNoErrors();
    expect($agency->refresh()->logo_path)->toBeNull();
    Storage::disk('public')->assertMissing('agency-logos/a.png');

    Storage::disk('public')->put('agency-logos/b.png', 'png');
    $other = Agency::factory()->create(['logo_path' => 'agency-logos/b.png']);
    $this->actingAs($admin)->delete(route('agencies.destroy', $other));
    Storage::disk('public')->assertMissing('agency-logos/b.png');
});

test('the detail page exposes the logo URL; a member in read-only cannot change it', function (): void {
    $agency = Agency::factory()->create(['logo_path' => 'agency-logos/a.png']);
    $reader = User::factory()->create(['role' => 'member', 'permissions' => [SiteSection::Agents->value => 'read']]);

    $this->actingAs($reader)->get(route('agencies.show', $agency))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agency.logo', Storage::disk('public')->url('agency-logos/a.png')));

    $this->actingAs($reader)->post(route('agencies.logo.update', $agency), ['logo' => UploadedFile::fake()->image('logo.png')])->assertForbidden();
    $this->actingAs($reader)->delete(route('agencies.logo.destroy', $agency))->assertForbidden();
});
