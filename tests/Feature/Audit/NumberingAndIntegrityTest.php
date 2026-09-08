<?php

declare(strict_types=1);

use App\Actions\Invoices\CreateInvoice;
use App\Actions\Leads\UpdateLead;
use App\Actions\Properties\DeleteProperty;
use App\Actions\Quotes\CreateQuote;
use App\Actions\Staff\DeleteStaffMember;
use App\Actions\Staff\UpdateStaffAccess;
use App\Data\LeadData;
use App\Enums\InvoiceStatus;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Property;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('invoice and quote numbering continues past 999 with a numeric order', function (): void {
    Invoice::factory()->create(['number' => 'RP-27999']);
    Invoice::factory()->create(['number' => 'RP-271000']);
    Quote::factory()->create(['number' => 'DV-27999']);
    Quote::factory()->create(['number' => 'DV-271001']);

    expect(CreateInvoice::nextNumber())->toBe('RP-271001')
        ->and(CreateQuote::nextNumber())->toBe('DV-271002');
});

test('editing a website lead keeps its external reference so a replayed delivery stays idempotent', function (): void {
    $lead = Lead::factory()->create(['external_reference' => 'CT-4F2A11', 'first_name' => 'Léa', 'last_name' => 'Durand']);

    (new UpdateLead)->handle($lead, LeadData::from(['first_name' => 'Léa', 'last_name' => 'Martin', 'email' => 'lea@example.com']));

    expect($lead->fresh()->external_reference)->toBe('CT-4F2A11')
        ->and($lead->fresh()->last_name)->toBe('Martin');
});

test('an invoice cannot be created directly in a paid status', function (): void {
    $manager = User::factory()->manager()->create();

    $this->actingAs($manager)
        ->post(route('invoices.store'), [
            'client_name' => 'Nestlé',
            'client_email' => 'compta@example.com',
            'currency' => 'EUR',
            'vat_rate' => 8.1,
            'issued_at' => '2026-09-01',
            'due_at' => '2026-10-01',
            'status' => 'paid',
            'items' => [['offer' => 'accompagne', 'quantity' => 1, 'unit_price_cents' => 100_000]],
        ]);

    $invoice = Invoice::query()->latest('id')->first();
    expect($invoice)->not->toBeNull()
        ->and($invoice->status)->toBe(InvoiceStatus::Draft);
});

test('the last administrator can neither be deleted, demoted, nor delete their own profile', function (): void {
    $admin = User::factory()->admin()->create();
    $member = User::factory()->create();

    expect(fn () => (new DeleteStaffMember)->handle($admin, $admin))->toThrow(ValidationException::class);
    expect(fn (): User => (new UpdateStaffAccess)->handle($admin, StaffRole::Member, null, [], $admin))->toThrow(ValidationException::class);
    expect(User::query()->find($admin->id))->not->toBeNull();

    $this->actingAs($admin)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertRedirect(route('profile.edit'))
        ->assertSessionHasErrors(['member']);
    expect(User::query()->find($admin->id))->not->toBeNull();

    // Avec un second administrateur, la suppression passe et l'équipe est prévenue.
    User::factory()->admin()->create();
    (new DeleteStaffMember)->handle($member, $admin);
    expect(User::query()->find($member->id))->toBeNull();
});

test('deleting a member or a property removes its files from the public disk', function (): void {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    User::factory()->admin()->create();
    Storage::disk('public')->put('avatars/a.jpg', 'x');
    Storage::disk('public')->put('properties/p1.jpg', 'x');
    Storage::disk('public')->put('properties/p2.jpg', 'x');
    $member = User::factory()->create(['avatar_path' => 'avatars/a.jpg']);
    $property = Property::factory()->create(['photos' => ['properties/p1.jpg', 'properties/p2.jpg']]);

    (new DeleteStaffMember)->handle($member, $admin);
    (new DeleteProperty)->handle($property);

    Storage::disk('public')->assertMissing(['avatars/a.jpg', 'properties/p1.jpg', 'properties/p2.jpg']);
});
