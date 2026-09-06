<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\RemoveProfileAvatar;
use App\Actions\Settings\UpdateProfileAvatar;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;

class AvatarController extends Controller
{
    /**
     * Remplace la photo de profil de l'utilisateur connecté.
     */
    public function update(AvatarUpdateRequest $request, UpdateProfileAvatar $action): RedirectResponse
    {
        $photo = $request->file('avatar');

        if ($photo instanceof UploadedFile) {
            $action->handle($request->user(), $photo);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile photo updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Retire la photo de profil de l'utilisateur connecté.
     */
    public function destroy(Request $request, RemoveProfileAvatar $action): RedirectResponse
    {
        $action->handle($request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile photo removed.')]);

        return to_route('profile.edit');
    }
}
