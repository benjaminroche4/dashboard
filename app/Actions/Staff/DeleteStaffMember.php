<?php

declare(strict_types=1);

namespace App\Actions\Staff;

use App\Actions\Settings\UpdateProfileAvatar;
use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Retire l'accès au dashboard d'un membre : son compte est supprimé, ses
 * créations (leads, factures, notes…) restent, sans auteur. Le dernier
 * administrateur ne peut jamais être supprimé, sinon plus personne ne
 * gérerait l'équipe.
 */
final class DeleteStaffMember
{
    /** Vrai si ce membre est le seul administrateur restant. */
    public static function isLastAdmin(User $member): bool
    {
        return $member->isAdmin() && ! User::query()->whereKeyNot($member->id)->where('role', StaffRole::Admin)->exists();
    }

    /**
     * @throws ValidationException si le membre est le dernier administrateur.
     */
    public function handle(User $member, ?User $by = null): void
    {
        if (self::isLastAdmin($member)) {
            throw ValidationException::withMessages(['member' => __('Impossible de supprimer le dernier administrateur.')]);
        }

        $id = $member->id;
        $name = $member->name;
        $avatar = $member->avatar_path;

        $member->delete();

        if ($avatar !== null) {
            Storage::disk(UpdateProfileAvatar::DISK)->delete($avatar);
        }

        event(new DashboardUpdated('staff', ['id' => $id, 'deleted' => true], "a retiré l'accès de {$name}", $by));
    }
}
