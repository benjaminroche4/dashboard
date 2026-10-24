<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Storage::fake('public');
    Event::fake([DashboardUpdated::class]);
});

test('a member who can edit companies uploads a logo, which replaces the previous file', function (): void {
    $company = Company::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->from(route('companies.show', $company))
        ->post(route('companies.logo.update', $company), ['logo' => UploadedFile::fake()->image('logo.png', 200, 200)])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('companies.show', $company));

    $first = $company->refresh()->logo_path;
    expect($first)->toStartWith('company-logos/')
        ->and($company->logo)->not->toBeNull();
    Storage::disk('public')->assertExists($first);

    $this->actingAs($user)->post(route('companies.logo.update', $company), ['logo' => UploadedFile::fake()->image('new.webp', 100, 100)])
        ->assertSessionHasNoErrors();

    $second = $company->refresh()->logo_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'companies');
});

test('the logo must be an image of at most 2 MB', function (): void {
    $company = Company::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('companies.logo.update', $company), ['logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('logo');
    $this->actingAs($user)->post(route('companies.logo.update', $company), ['logo' => UploadedFile::fake()->image('big.png')->size(3 * 1024)])
        ->assertSessionHasErrors('logo');

    expect($company->refresh()->logo_path)->toBeNull();
});

test('the logo is removed with its file, and goes away with the company', function (): void {
    Storage::disk('public')->put('company-logos/a.png', 'png');
    $company = Company::factory()->create(['logo_path' => 'company-logos/a.png']);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->delete(route('companies.logo.destroy', $company))->assertSessionHasNoErrors();
    expect($company->refresh()->logo_path)->toBeNull();
    Storage::disk('public')->assertMissing('company-logos/a.png');

    Storage::disk('public')->put('company-logos/b.png', 'png');
    $other = Company::factory()->create(['logo_path' => 'company-logos/b.png']);
    $this->actingAs($admin)->delete(route('companies.destroy', $other));
    Storage::disk('public')->assertMissing('company-logos/b.png');
});

test('the detail page and the list expose the logo URL; a member in read-only cannot change it', function (): void {
    $company = Company::factory()->create(['logo_path' => 'company-logos/a.png']);
    $reader = User::factory()->create(['role' => 'member', 'permissions' => [SiteSection::Companies->value => 'read']]);

    $this->actingAs($reader)->get(route('companies.show', $company))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('company.logo', Storage::disk('public')->url('company-logos/a.png')));
    $this->actingAs($reader)->get(route('companies.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('companies.0.logo', Storage::disk('public')->url('company-logos/a.png')));

    $this->actingAs($reader)->post(route('companies.logo.update', $company), ['logo' => UploadedFile::fake()->image('logo.png')])->assertForbidden();
    $this->actingAs($reader)->delete(route('companies.logo.destroy', $company))->assertForbidden();
});
