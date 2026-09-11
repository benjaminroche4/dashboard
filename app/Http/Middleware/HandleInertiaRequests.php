<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\LeadStatus;
use App\Enums\StaffFunction;
use App\Enums\WebsiteHelpType;
use App\Http\Controllers\Auth\GoogleLoginController;
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
                // Niveau d'accès par section (`none` masque la section du menu, le middleware refuse la route).
                'access' => $request->user()?->accessLevels(),
            ],
            // Annuaire du staff (pour l'état connecté / hors ligne du panneau d'informations).
            'staff' => fn (): array => $request->user() === null
                ? []
                : User::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'role', 'functions', 'avatar_path'])
                    ->map(fn (User $member): array => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'role' => $member->role->value,
                        'avatar' => $member->avatar,
                        // Libellés des fonctions (« Agent de visite »…), affichés là où l'on choisit un membre.
                        'functions' => array_map(fn (StaffFunction $function): string => $function->label(), $member->staffFunctions()),
                    ])
                    ->all(),
            'features' => [
                'addressAutocomplete' => (bool) config('services.google.maps_key'),
                // Assistant IA (import d'annonces, qualification, matching) : masque les boutons sans clé.
                'assistant' => (bool) config('services.anthropic.key'),
                // Clé navigateur : publique par nature, à restreindre par référent dans la console Google.
                'googleMapsKey' => config('services.google.maps_browser_key') ?: null,
                // « Se connecter avec Google » : le bouton n'apparaît qu'avec des identifiants OAuth.
                'googleLogin' => GoogleLoginController::configured(),
            ],
            // Compteurs du menu : leads « À traiter » (tous, et ceux des propriétaires), rafraîchis à chaque événement temps réel.
            'counts' => fn (): array => $request->user() === null
                ? ['leadsTodo' => 0, 'ownerLeadsTodo' => 0]
                : [
                    'leadsTodo' => Lead::query()->where('status', LeadStatus::Todo)->count(),
                    'ownerLeadsTodo' => Lead::query()->where('status', LeadStatus::Todo)->where('help_type', WebsiteHelpType::RentalManagement)->count(),
                ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
