<?php

declare(strict_types=1);

use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Enums\StaffFunction;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\CatalogDocument;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Partner;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('each role has default levels per section: admins manage, managers write, members write except quotes and invoices', function (): void {
    $admin = User::factory()->admin()->create();
    $manager = User::factory()->manager()->create();
    $member = User::factory()->create();

    expect($admin->accessLevel(SiteSection::Invoices))->toBe(AccessLevel::Manage)
        ->and($manager->accessLevel(SiteSection::Invoices))->toBe(AccessLevel::Write)
        ->and($manager->accessLevel(SiteSection::Leads))->toBe(AccessLevel::Write)
        ->and($member->accessLevel(SiteSection::Invoices))->toBe(AccessLevel::Read)
        ->and($member->accessLevel(SiteSection::Quotes))->toBe(AccessLevel::Read)
        ->and($member->accessLevel(SiteSection::Leads))->toBe(AccessLevel::Write)
        ->and($member->canRead(SiteSection::Invoices))->toBeTrue()
        ->and($member->canWrite(SiteSection::Invoices))->toBeFalse()
        ->and($member->canManage(SiteSection::Leads))->toBeFalse()
        ->and($member->hasCustomPermissions())->toBeFalse()
        ->and(SiteSection::roleDefaults()['member']['quotes'])->toBe('read');
});

test('an admin opens the rights page of a member and saves role, levels and functions, only the differences being stored', function (): void {
    $admin = User::factory()->admin()->create();
    $member = User::factory()->create(['name' => 'Zoé Petit']);

    $this->actingAs(User::factory()->manager()->create())->get(route('team.show', $member))->assertForbidden();

    $this->actingAs($admin)
        ->get(route('team.show', $member))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('settings/team-member')
            ->where('member.uuid', $member->uuid)
            ->where('member.access.invoices', 'read')
            ->where('member.access.leads', 'write')
            ->where('member.custom_permissions', false)
            ->where('member.can_change_role', true)
            ->has('sections', count(SiteSection::cases()))
            ->has('levels', 4)
            ->has('functionOptions', count(StaffFunction::cases()))
            ->where('roleDefaults.admin.leads', 'manage'));

    $permissions = SiteSection::roleDefaults()['member'];
    $permissions['invoices'] = 'write';
    $permissions['leads'] = 'none';
    $permissions['leads_create'] = 'none';
    $permissions['visits'] = 'manage';

    $this->actingAs($admin)
        ->from(route('team.show', $member))
        ->patch(route('team.access', $member), ['permissions' => $permissions, 'functions' => ['visits', 'dossiers']])
        ->assertRedirect(route('team.show', $member))
        ->assertSessionHasNoErrors();

    $member->refresh();
    expect($member->permissions)->toBe(['leads' => 'none', 'leads_create' => 'none', 'visits' => 'manage', 'invoices' => 'write'])
        ->and($member->accessLevel(SiteSection::Invoices))->toBe(AccessLevel::Write)
        ->and($member->accessLevel(SiteSection::Leads))->toBe(AccessLevel::None)
        ->and($member->accessLevel(SiteSection::Clients))->toBe(AccessLevel::Write)
        ->and($member->canManage(SiteSection::Visits))->toBeTrue()
        ->and($member->hasCustomPermissions())->toBeTrue()
        ->and($member->staffFunctions())->toBe([StaffFunction::Dossiers, StaffFunction::Visits]);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'staff' && $event->message === 'a modifié les droits de Zoé Petit');

    $this->actingAs($member)->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('auth.access.leads', 'none')
            ->where('auth.access.invoices', 'write')
            ->where('staff.2.functions', ['Gestion des dossiers', 'Agent de visite']));

    // Rôle changé : les droits identiques aux nouveaux défauts ne sont plus mémorisés.
    $this->actingAs($admin)
        ->patch(route('team.access', $member), ['role' => 'manager', 'permissions' => [...SiteSection::roleDefaults()['manager'], 'leads' => 'none'], 'functions' => []])
        ->assertRedirect();
    $member->refresh();
    expect($member->role)->toBe(StaffRole::Manager)
        ->and($member->permissions)->toBe(['leads' => 'none'])
        ->and($member->functions)->toBe([]);

    // Sans `permissions` : retour aux droits du rôle.
    $this->actingAs($admin)->patch(route('team.access', $member), ['functions' => []])->assertRedirect();
    expect($member->refresh()->permissions)->toBeNull();

    // Un administrateur garde tous les droits quoi qu'on enregistre, et personne ne change son propre rôle.
    $this->actingAs($admin)
        ->patch(route('team.access', $admin), ['permissions' => [...SiteSection::roleDefaults()['admin'], 'leads' => 'none'], 'functions' => []])
        ->assertRedirect();
    expect($admin->refresh()->permissions)->toBeNull()->and($admin->accessLevel(SiteSection::Leads))->toBe(AccessLevel::Manage);
    $this->actingAs($admin)->patch(route('team.access', $admin), ['role' => 'member', 'functions' => []])->assertForbidden();

    $this->actingAs($admin)
        ->patch(route('team.access', $member), ['permissions' => ['leads' => 'god'], 'functions' => ['pilot']])
        ->assertSessionHasErrors(['permissions.leads', 'permissions.invoices', 'functions.0']);
    $this->actingAs($member)->patch(route('team.access', $member), ['functions' => []])->assertForbidden();
});

test('levels drive the policies and the middleware: none refuses the pages, read forbids changes, manage allows deletion', function (): void {
    $member = User::factory()->create(['permissions' => ['leads' => 'none', 'leads_create' => 'none', 'owner_leads_create' => 'none', 'invoices' => 'write', 'partners' => 'read', 'visits' => 'manage']]);
    $lead = Lead::factory()->create();
    $invoice = Invoice::factory()->create();

    $this->actingAs($member)->get(route('leads.index'))->assertForbidden();
    $this->actingAs($member)->get(route('leads.create'))->assertForbidden();
    // Un lead locataire relève de « Leads » (fermé ici) ; un lead propriétaire de « Leads propriétaires » (ouvert).
    $this->actingAs($member)->get(route('leads.show', $lead))->assertForbidden();
    $this->actingAs($member)->get(route('leads.show', Lead::factory()->rentalManagement()->create()))->assertOk();
    $this->actingAs($member)->get(route('invoices.index'))->assertOk();
    $this->actingAs($member)->get(route('invoices.create'))->assertOk();
    expect($member->can('delete', $invoice))->toBeFalse()->and($member->can('update', $invoice))->toBeTrue();
    $this->actingAs($member)->get(route('partners.index'))->assertOk();
    $this->actingAs($member)->post(route('partners.store'), ['name' => 'X', 'type' => 'bank'])->assertForbidden();
    $this->actingAs($member)->get(route('dashboard'))->assertOk();
    $this->actingAs($member)->get(route('profile.edit'))->assertOk();

    expect($member->can('delete', Visit::factory()->create()))->toBeTrue()
        ->and($member->can('create', Partner::class))->toBeFalse()
        ->and($member->can('viewAny', CatalogDocument::class))->toBeFalse();

    // « Tous les outils » s'ouvre dès qu'un outil est consultable.
    $member->forceFill(['permissions' => [...array_fill_keys(array_column(SiteSection::cases(), 'value'), 'none'), 'reports' => 'read']])->save();
    $this->actingAs($member)->get(route('tools.index'))->assertOk();
    $this->actingAs($member)->get(route('tools.reports.index'))->assertOk();
    $this->actingAs($member)->get(route('invoices.index'))->assertForbidden();
});

test('the team page tells which members have custom rights and closed sections', function (): void {
    $admin = User::factory()->admin()->create(['name' => 'Admin']);
    User::factory()->create(['name' => 'Zoé Petit', 'permissions' => ['leads' => 'none', 'visits' => 'none'], 'functions' => ['visits']]);

    $this->actingAs($admin)
        ->get(route('team.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('members.0.custom_permissions', false)
            ->where('members.0.closed_sections', 0)
            ->where('members.1.custom_permissions', true)
            ->where('members.1.closed_sections', 2)
            ->where('members.1.function_labels', ['Agent de visite']));
});

test('every section maps its routes and no other route is guarded by mistake', function (): void {
    expect(SiteSection::forRoute('leads.create'))->toBe([SiteSection::LeadsCreate, SiteSection::OwnerLeadsCreate])
        ->and(SiteSection::forRoute('leads.index'))->toBe([SiteSection::Leads])
        ->and(SiteSection::forRoute('leads.notes.store'))->toBe([SiteSection::Leads, SiteSection::OwnerLeads])
        ->and(SiteSection::forRoute('owners.leads'))->toBe([SiteSection::OwnerLeads])
        ->and(SiteSection::forRoute('owners.convert'))->toBe([SiteSection::Owners])
        ->and(SiteSection::forRoute('clients.visits.store'))->toBe([SiteSection::Visits])
        ->and(SiteSection::forRoute('clients.show'))->toBe([SiteSection::Clients])
        ->and(SiteSection::forRoute('tools.documents.pdf'))->toBe([SiteSection::Documents])
        ->and(SiteSection::forRoute('invoices.pdf'))->toBe([SiteSection::Invoices])
        ->and(SiteSection::forRoute('tools.reports.index'))->toBe([SiteSection::Reports])
        ->and(SiteSection::forRoute('tools.activity.index'))->toBe([SiteSection::Reports])
        ->and(SiteSection::forRoute('dashboard'))->toBe([])
        ->and(SiteSection::forRoute('team.access'))->toBe([])
        ->and(SiteSection::forRoute(null))->toBe([]);
});
