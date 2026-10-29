<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Partner;
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

test('a member who can edit partners uploads a logo, which replaces the previous file', function (): void {
    $partner = Partner::factory()->create(['name' => 'Zen Assurances']);
    $user = User::factory()->create();

    $this->actingAs($user)->from(route('partners.show', $partner))
        ->post(route('partners.logo.update', $partner), ['logo' => UploadedFile::fake()->image('logo.png', 200, 200)])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('partners.show', $partner));

    $first = $partner->refresh()->logo_path;
    expect($first)->toStartWith('partner-logos/')
        ->and($partner->logo)->not->toBeNull();
    Storage::disk('public')->assertExists($first);

    $this->actingAs($user)->post(route('partners.logo.update', $partner), ['logo' => UploadedFile::fake()->image('new.webp', 100, 100)])
        ->assertSessionHasNoErrors();
    $second = $partner->refresh()->logo_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'partners'
        && $event->message === 'a changé le logo du partenaire Zen Assurances');
});

test('the logo must be an image of at most 2 MB', function (): void {
    $partner = Partner::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('partners.logo.update', $partner), ['logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('logo');
    $this->actingAs($user)->post(route('partners.logo.update', $partner), ['logo' => UploadedFile::fake()->image('big.png')->size(3 * 1024)])
        ->assertSessionHasErrors('logo');
    expect($partner->refresh()->logo_path)->toBeNull();
});

test('the logo is removed with its file, and goes away with the partner', function (): void {
    Storage::disk('public')->put('partner-logos/a.png', 'png');
    $partner = Partner::factory()->create(['logo_path' => 'partner-logos/a.png']);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->delete(route('partners.logo.destroy', $partner))->assertSessionHasNoErrors();
    expect($partner->refresh()->logo_path)->toBeNull();
    Storage::disk('public')->assertMissing('partner-logos/a.png');

    Storage::disk('public')->put('partner-logos/b.png', 'png');
    $other = Partner::factory()->create(['logo_path' => 'partner-logos/b.png']);
    $this->actingAs($admin)->delete(route('partners.destroy', $other));
    Storage::disk('public')->assertMissing('partner-logos/b.png');
});

test('the list and the detail page expose the logo URL; a member in read-only cannot change it', function (): void {
    $partner = Partner::factory()->create(['logo_path' => 'partner-logos/a.png']);
    $reader = User::factory()->create(['role' => 'member', 'permissions' => [SiteSection::Partners->value => 'read']]);

    $this->actingAs($reader)->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partner.logo', Storage::disk('public')->url('partner-logos/a.png'))
            ->missing('activities'));
    $this->actingAs($reader)->get(route('partners.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('partners.0.logo', Storage::disk('public')->url('partner-logos/a.png')));
    $this->actingAs($reader)->post(route('partners.logo.update', $partner), ['logo' => UploadedFile::fake()->image('logo.png')])->assertForbidden();
    $this->actingAs($reader)->delete(route('partners.logo.destroy', $partner))->assertForbidden();
});
