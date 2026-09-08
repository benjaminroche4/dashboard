<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\AccessLevel;
use App\Enums\SiteSection;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Refuse (403) une route dont la section n'est pas ouverte au membre connecté.
 * Les routes sans section (tableau de bord, paramètres, connexion) passent.
 */
final class EnsureSectionAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $sections = SiteSection::forRoute($request->route()?->getName());

        abort_if($user !== null && $sections !== [] && ! $user->hasLevel(AccessLevel::Read, ...$sections), 403);

        return $next($request);
    }
}
