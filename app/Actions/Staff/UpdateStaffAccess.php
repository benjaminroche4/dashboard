<?php

declare(strict_types=1);

namespace App\Actions\Staff;

use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use App\Enums\StaffFunction;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Règle le rôle, les droits par section et les fonctions d'un membre. Seules
 * les sections dont le niveau diffère de celui du rôle sont mémorisées ; un
 * administrateur gère toujours tout, ses droits ne sont pas enregistrés.
 */
final class UpdateStaffAccess
{
    /**
     * @param  array<string, AccessLevel>|null  $permissions  niveau par section (clé = valeur de SiteSection) ; null = ceux du rôle
     * @param  list<StaffFunction>  $functions
     */
    public function handle(User $member, ?StaffRole $role, ?array $permissions, array $functions, ?User $by = null): User
    {
        if ($role instanceof StaffRole) {
            if ($role !== StaffRole::Admin && DeleteStaffMember::isLastAdmin($member)) {
                throw ValidationException::withMessages(['role' => __('Impossible de rétrograder le dernier administrateur.')]);
            }

            $member->role = $role;
        }

        $custom = [];
        foreach ($permissions ?? [] as $key => $level) {
            $section = SiteSection::from($key);
            // « Gérer » n'existe pas partout : il vaut « Modifier » ailleurs.
            $wanted = $section->clamp($level);

            if ($wanted !== $section->clamp($section->defaultLevel($member->role))) {
                $custom[$section->value] = $wanted->value;
            }
        }

        $member->permissions = $member->isAdmin() || $custom === [] ? null : $custom;
        $member->functions = array_values(array_unique(array_map(fn (StaffFunction $function): string => $function->value, $functions)));
        $member->save();

        event(new DashboardUpdated('staff', ['id' => $member->id], "a modifié les droits de {$member->name}", $by));

        return $member;
    }
}
