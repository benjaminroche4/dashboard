<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'can' => [
                    'manageStaff' => $request->user()?->can('viewAny', User::class) ?? false,
                    'viewPulse' => $request->user()?->can('viewPulse') ?? false,
                ],
            ],
            // Annuaire du staff (pour l'état connecté / hors ligne du panneau d'informations).
            'staff' => fn (): array => $request->user() === null
                ? []
                : User::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'role', 'avatar_path'])
                    ->map(fn (User $member): array => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'role' => $member->role->value,
                        'avatar' => $member->avatar,
                    ])
                    ->all(),
            'features' => [
                'addressAutocomplete' => (bool) config('services.google.maps_key'),
                // Clé navigateur : publique par nature, à restreindre par référent dans la console Google.
                'googleMapsKey' => config('services.google.maps_browser_key') ?: null,
            ],
            // Compteurs du menu : leads « À traiter », rafraîchis à chaque événement temps réel.
            'counts' => fn (): array => [
                'leadsTodo' => $request->user() === null ? 0 : Lead::query()->where('status', LeadStatus::Todo)->count(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
