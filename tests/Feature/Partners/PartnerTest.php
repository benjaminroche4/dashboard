<?php

declare(strict_types=1);

use App\Enums\PartnerType;
use App\Events\DashboardUpdated;
use App\Mail\DirectoryWelcome;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the partners page lists every partner with its type, sorted by name, plus the types for the form', function (): void {
    $this->get(route('partners.index'))->assertRedirect(route('login'));

    $author = User::factory()->create(['name' => 'Admin']);
    Partner::factory()->type(PartnerType::Insurance)->create(['name' => 'Zen Assurances', 'created_by' => $author->id]);
    Partner::factory()->type(PartnerType::Management)->create(['name' => 'Alpha Gestion']);

    $this->actingAs($author)
        ->get(route('partners.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('partners/index')
            ->has('partners', 2)
            ->where('partners.0.name', 'Alpha Gestion')
            ->where('partners.0.type_label', 'Gestion')
            ->where('partners.1.creator', 'Admin')
            ->has('types', count(PartnerType::cases())));
});

test('a partner has a detail page addressed by uuid', function (): void {
    $partner = Partner::factory()->type(PartnerType::Bank)->create(['name' => 'Banque du Nord']);

    $this->actingAs(User::factory()->create())
        ->get(route('partners.show', $partner))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('partners/show')
            ->where('partner.uuid', $partner->uuid)
            ->where('partner.type_label', 'Banque'));

    $this->actingAs(User::factory()->create())->get('/partners/'.$partner->id)->assertNotFound();
});

test('any member creates and updates a partner, the payload is validated', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)
        ->from(route('partners.index'))
        ->post(route('partners.store'), [
            'name' => '  Zen Assurances ',
            'type' => 'insurance',
            'email' => 'contact@zen.example',
            'phone' => '',
            'website' => 'https://zen.example',
        ])
        ->assertRedirect(route('partners.index'))
        ->assertSessionHasNoErrors();

    $partner = Partner::query()->firstOrFail();

    expect($partner->name)->toBe('Zen Assurances')
        ->and($partner->type)->toBe(PartnerType::Insurance)
        ->and($partner->phone)->toBeNull()
        ->and($partner->created_by)->toBe($member->id);

    $this->actingAs($member)
        ->patch(route('partners.update', $partner), ['name' => 'Zen', 'type' => 'unknown', 'website' => 'nope'])
        ->assertSessionHasErrors(['type', 'website']);

    $this->actingAs($member)
        ->patch(route('partners.update', $partner), ['name' => 'Zen Assurances & Co', 'type' => 'partnership'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($partner->refresh()->type)->toBe(PartnerType::Partnership);
    Event::assertDispatched(DashboardUpdated::class, 2);
});

test('a new partner is e-mailed only when asked, and only if it has an address', function (): void {
    Mail::fake();
    $member = User::factory()->create(['name' => 'Charles', 'email' => 'charles@relocation-in-paris.fr']);

    $this->actingAs($member)
        ->post(route('partners.store'), ['name' => 'Silencieux', 'type' => 'bank', 'email' => 'bank@example.com'])
        ->assertSessionHasNoErrors();
    Mail::assertNothingSent();

    $this->actingAs($member)
        ->post(route('partners.store'), ['name' => 'Sans adresse', 'type' => 'bank', 'phone' => '+33 1 00 00 00 00', 'notify' => true])
        ->assertSessionHasNoErrors();
    Mail::assertNothingSent();

    $this->actingAs($member)
        ->post(route('partners.store'), ['name' => 'Zen Assurances', 'type' => 'insurance', 'email' => 'contact@zen.example', 'notify' => true])
        ->assertSessionHasNoErrors();

    Mail::assertSent(DirectoryWelcome::class, fn (DirectoryWelcome $mail): bool => $mail->hasTo('contact@zen.example')
        && $mail->name === 'Zen Assurances'
        && $mail->hasReplyTo('charles@relocation-in-paris.fr')
        && str_contains($mail->render(), 'Bienvenue parmi nos partenaires')
        && str_contains($mail->render(), 'Assurance'));
});

test('only admins delete a partner, and the duplicates lookup finds partners by contact', function (): void {
    $partner = Partner::factory()->create(['email' => 'contact@zen.example', 'phone' => '+33 1 42 00 11 22']);

    $this->actingAs(User::factory()->create())
        ->getJson(route('partners.duplicates', ['phone' => '01 42 00 11 22']))
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', $partner->name);

    $this->actingAs(User::factory()->create())
        ->delete(route('partners.destroy', $partner))
        ->assertForbidden();

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('partners.destroy', $partner))
        ->assertRedirect(route('partners.index'));

    expect(Partner::query()->count())->toBe(0);
});
