<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Dashboard\BuildMyWork;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tableau de bord : « Mon travail » (leads et dossiers attribués au membre).
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request, BuildMyWork $buildMyWork): Response
    {
        return Inertia::render('dashboard', [
            'mine' => $buildMyWork->handle($request->user()),
            'realtimeOnly' => ['mine'],
        ]);
    }
}
