<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\StaffRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restreint une route à un ou plusieurs rôles : ->middleware('role:admin,manager').
 */
final class EnsureStaffRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_if($user === null, 401);

        $allowed = array_map(StaffRole::from(...), $roles);

        abort_unless($user->hasRole(...$allowed), 403);

        return $next($request);
    }
}
