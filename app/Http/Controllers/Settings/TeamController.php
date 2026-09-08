<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Actions\Staff\CreateStaffMember;
use App\Actions\Staff\DeleteStaffMember;
use App\Actions\Staff\UpdateStaffAccess;
use App\Data\StaffMemberData;
use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Enums\StaffFunction;
use App\Enums\StaffRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffMemberRequest;
use App\Http\Requests\Staff\UpdateStaffAccessRequest;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Page « Équipe » des paramètres : les membres qui ont accès au dashboard,
 * ajout d'un membre, retrait d'un accès. Administrateurs seulement.
 */
class TeamController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $members = User::query()
            ->orderBy('name')
            ->get()
            ->map(fn (User $member): array => [
                'id' => $member->id,
                'uuid' => $member->uuid,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->role->value,
                'role_label' => $member->role->label(),
                'avatar' => $member->avatar,
                'two_factor_enabled' => $member->hasEnabledTwoFactorAuthentication(),
                'created_at' => $member->created_at?->toIso8601String(),
                'is_me' => $member->is($request->user()),
                'can_delete' => $request->user()->can('delete', $member),
                'function_labels' => array_map(fn (StaffFunction $function): string => $function->label(), $member->staffFunctions()),
                // Droits personnalisés (différents de ceux du rôle) et sections fermées.
                'custom_permissions' => $member->hasCustomPermissions(),
                'closed_sections' => count(array_filter($member->accessLevels(), fn (string $level): bool => $level === AccessLevel::None->value)),
            ])
            ->all();

        return Inertia::render('settings/team', [
            'members' => $members,
            'roles' => array_map(fn (StaffRole $role): array => ['value' => $role->value, 'label' => $role->label()], StaffRole::cases()),
            'realtimeOnly' => ['members'],
        ]);
    }

    public function store(StoreStaffMemberRequest $request, CreateStaffMember $create): RedirectResponse
    {
        $this->authorize('create', User::class);

        /** @var array{name: string, email: string, password: string, role: string} $validated */
        $validated = $request->validated();
        $member = $create->handle(StaffMemberData::from($validated), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name a maintenant accès au dashboard.', ['name' => $member->name])]);

        return back();
    }

    /** Page « Droits et fonctions » d'un membre : rôle, niveau par section, fonctions. */
    public function show(Request $request, User $member): Response
    {
        $this->authorize('updateAccess', $member);

        return Inertia::render('settings/team-member', [
            'member' => [
                'id' => $member->id,
                'uuid' => $member->uuid,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->role->value,
                'role_label' => $member->role->label(),
                'avatar' => $member->avatar,
                'two_factor_enabled' => $member->hasEnabledTwoFactorAuthentication(),
                'created_at' => $member->created_at?->toIso8601String(),
                'is_me' => $member->is($request->user()),
                'can_change_role' => $request->user()->can('updateRole', $member),
                'functions' => array_map(fn (StaffFunction $function): string => $function->value, $member->staffFunctions()),
                'access' => $member->accessLevels(),
                'custom_permissions' => $member->hasCustomPermissions(),
            ],
            'roles' => array_map(fn (StaffRole $role): array => ['value' => $role->value, 'label' => $role->label()], StaffRole::cases()),
            'sections' => SiteSection::options(),
            'levels' => AccessLevel::options(),
            'functionOptions' => StaffFunction::options(),
            'roleDefaults' => SiteSection::roleDefaults(),
        ]);
    }

    /** Enregistre rôle, droits par section et fonctions. */
    public function access(UpdateStaffAccessRequest $request, User $member, UpdateStaffAccess $update): RedirectResponse
    {
        $this->authorize('updateAccess', $member);

        /** @var array{role?: string|null, permissions?: array<string, string>|null, functions: list<string>} $validated */
        $validated = $request->validated();
        $role = isset($validated['role']) ? StaffRole::from($validated['role']) : null;

        if ($role !== null && $role !== $member->role) {
            $this->authorize('updateRole', $member);
        }

        $permissions = isset($validated['permissions'])
            ? array_map(AccessLevel::from(...), $validated['permissions'])
            : null;

        $member = $update->handle($member, $role, $permissions, array_map(StaffFunction::from(...), $validated['functions']), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Droits de :name mis à jour.', ['name' => $member->name])]);

        return back();
    }

    public function destroy(Request $request, User $member, DeleteStaffMember $delete): RedirectResponse
    {
        $this->authorize('delete', $member);

        $name = $member->name;
        $delete->handle($member, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __("L'accès de :name a été retiré.", ['name' => $name])]);

        return back();
    }
}
