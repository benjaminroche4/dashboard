<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Dashboard\ResolveLandingPage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** `/dashboard` n'est plus une page : il mène à la première liste ouverte au membre. */
class DashboardController extends Controller
{
    public function __invoke(Request $request, ResolveLandingPage $landing): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        return to_route($landing->handle($user));
    }
}
