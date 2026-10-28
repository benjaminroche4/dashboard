<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use App\Events\DashboardUpdated;
use App\Models\Agent;
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

test('a member who can edit agents uploads a photo, which replaces the previous file', function (): void {
    $agent = Agent::factory()->create(['first_name' => 'Marthe', 'last_name' => 'Dupuy']);
    $user = User::factory()->create();

    $this->actingAs($user)->from(route('agents.show', $agent))
        ->post(route('agents.photo.update', $agent), ['photo' => UploadedFile::fake()->image('photo.png', 200, 200)])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('agents.show', $agent));

    $first = $agent->refresh()->photo_path;
    expect($first)->toStartWith('agent-photos/')
        ->and($agent->photo)->not->toBeNull();
    Storage::disk('public')->assertExists($first);

    $this->actingAs($user)->post(route('agents.photo.update', $agent), ['photo' => UploadedFile::fake()->image('new.webp', 100, 100)])
        ->assertSessionHasNoErrors();

    $second = $agent->refresh()->photo_path;
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'agents'
        && $event->message === "a changé la photo de l'agent Marthe Dupuy");
});

test('the photo must be an image of at most 2 MB', function (): void {
    $agent = Agent::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('agents.photo.update', $agent), ['photo' => UploadedFile::fake()->create('photo.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('photo');
    $this->actingAs($user)->post(route('agents.photo.update', $agent), ['photo' => UploadedFile::fake()->image('big.png')->size(3 * 1024)])
        ->assertSessionHasErrors('photo');

    expect($agent->refresh()->photo_path)->toBeNull();
});

test('the photo is removed with its file, and goes away with the agent', function (): void {
    Storage::disk('public')->put('agent-photos/a.png', 'png');
    $agent = Agent::factory()->create(['photo_path' => 'agent-photos/a.png']);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->delete(route('agents.photo.destroy', $agent))->assertSessionHasNoErrors();
    expect($agent->refresh()->photo_path)->toBeNull();
    Storage::disk('public')->assertMissing('agent-photos/a.png');

    Storage::disk('public')->put('agent-photos/b.png', 'png');
    $other = Agent::factory()->create(['photo_path' => 'agent-photos/b.png']);
    $this->actingAs($admin)->delete(route('agents.destroy', $other));
    Storage::disk('public')->assertMissing('agent-photos/b.png');
});

test('the detail page exposes the photo URL; a member in read-only cannot change it', function (): void {
    $agent = Agent::factory()->create(['photo_path' => 'agent-photos/a.png']);
    $reader = User::factory()->create(['role' => 'member', 'permissions' => [SiteSection::Agents->value => 'read']]);

    $this->actingAs($reader)->get(route('agents.show', $agent))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('agent.photo', Storage::disk('public')->url('agent-photos/a.png')));

    $this->actingAs($reader)->post(route('agents.photo.update', $agent), ['photo' => UploadedFile::fake()->image('photo.png')])->assertForbidden();
    $this->actingAs($reader)->delete(route('agents.photo.destroy', $agent))->assertForbidden();
});
