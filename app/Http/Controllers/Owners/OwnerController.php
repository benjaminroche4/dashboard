<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owners;

use App\Actions\Owners\ConvertOwnerToLead;
use App\Actions\Owners\CreateOwner;
use App\Actions\Owners\DeleteOwner;
use App\Actions\Owners\UpdateOwner;
use App\Data\OwnerData;
use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Enums\OwnerStatus;
use App\Enums\WebsiteHelpType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Properties\PropertyController;
use App\Http\Requests\Owners\StoreOwnerRequest;
use App\Http\Requests\Owners\UpdateOwnerRequest;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Property;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerController extends Controller
{
    use AuthorizesRequests;

    /** Propriétaires à prospecter, les « À contacter » en premier. */
    public function index(): Response
    {
        $this->authorize('viewAny', Owner::class);

        $owners = Owner::query()
            ->with(['creator', 'lead'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Owner $owner): array => self::summary($owner))
            ->all();

        return Inertia::render('owners/index', ['owners' => $owners, 'statuses' => OwnerStatus::options()]);
    }

    /** Leads propriétaires : demandes de gestion locative (site ou conversion), même vue que la liste des leads. */
    public function leads(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        $withArchived = $request->boolean('archived');
        $leads = Lead::query()
            ->with(['author', 'assignee'])
            ->where('help_type', WebsiteHelpType::RentalManagement)
            ->unless($withArchived, fn (Builder $query): Builder => $query->where('status', '!=', LeadStatus::Archived))
            ->orderBy('position')
            ->latest()
            ->get()
            ->map(fn (Lead $lead): array => LeadController::summary($lead, ownerLabels: true))
            ->all();

        return Inertia::render('owners/leads', [
            'leads' => $leads,
            'archived' => [
                'loaded' => $withArchived,
                'count' => Lead::query()->where('help_type', WebsiteHelpType::RentalManagement)->where('status', LeadStatus::Archived)->count(),
            ],
            // Colonnes du kanban (« En signature » à la place de « Devis envoyé ») et motifs d'archivage.
            'statuses' => LeadStatus::ownerOptions(),
            'offers' => LeadController::offers(),
            'lossReasons' => LeadLossReason::options(),
            'realtimeOnly' => ['leads'],
        ]);
    }

    /** Fiche d'un propriétaire : coordonnées, lead, biens de l'annuaire, notes. */
    public function show(Owner $owner): Response
    {
        $this->authorize('view', $owner);

        $owner->load(['creator', 'lead', 'properties.agent.agency', 'properties.creator']);
        $owner->properties->loadCount('visits');

        return Inertia::render('owners/show', [
            'owner' => self::summary($owner),
            'properties' => $owner->properties
                ->sortByDesc('created_at')
                ->values()
                ->map(fn (Property $property): array => PropertyController::summary($property))
                ->all(),
            'statuses' => OwnerStatus::options(),
        ]);
    }

    /** Propriétaires partageant l'e-mail ou le téléphone saisis (hors `except`), pour l'alerte doublons. */
    public function duplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Owner::class);

        $except = (int) $request->query('except', 0);

        return response()->json(Owner::query()
            ->matchingContact((string) $request->query('email', ''), (string) $request->query('phone', ''))
            ->when($except > 0, fn ($query) => $query->whereKeyNot($except))
            ->orderBy('last_name')
            ->limit(5)
            ->get()
            ->map(fn (Owner $owner): array => [
                'id' => $owner->id,
                'uuid' => $owner->uuid,
                'name' => $owner->fullName(),
                'agency' => $owner->company,
                'email' => $owner->email,
                'phone' => $owner->phone,
            ])
            ->all());
    }

    /** Recherche ⌘K : prénom, nom, société, e-mail ou téléphone, huit résultats au plus. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Owner::class);

        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        return response()->json(Owner::query()
            ->where(function ($builder) use ($query): void {
                $builder->whereRaw("first_name || ' ' || last_name like ?", ["%{$query}%"])
                    ->orWhere('company', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%");
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(8)
            ->get()
            ->map(fn (Owner $owner): array => [
                'id' => $owner->id,
                'uuid' => $owner->uuid,
                'title' => $owner->fullName(),
                'subtitle' => $owner->company !== null && $owner->company !== '' ? $owner->company : $owner->status->label(),
                'url' => route('owners.show', $owner),
            ])
            ->all());
    }

    public function store(StoreOwnerRequest $request, CreateOwner $create): RedirectResponse
    {
        $this->authorize('create', Owner::class);

        $owner = $create->handle(OwnerData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Propriétaire :name ajouté.', ['name' => $owner->fullName()])]);

        return back();
    }

    public function update(UpdateOwnerRequest $request, Owner $owner, UpdateOwner $update): RedirectResponse
    {
        $this->authorize('update', $owner);

        $owner = $update->handle($owner, OwnerData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Propriétaire :name mis à jour.', ['name' => $owner->fullName()])]);

        return back();
    }

    public function convert(Owner $owner, ConvertOwnerToLead $convert): RedirectResponse
    {
        $this->authorize('update', $owner);
        $this->authorize('create', Lead::class);

        $lead = $convert->handle($owner, auth()->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :reference créé pour :name.', ['reference' => $lead->reference, 'name' => $owner->fullName()])]);

        return to_route('leads.show', $lead);
    }

    public function destroy(Owner $owner, DeleteOwner $delete): RedirectResponse
    {
        $this->authorize('delete', $owner);

        $name = $owner->fullName();
        $delete->handle($owner);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Propriétaire :name supprimé.', ['name' => $name])]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Owner $owner): array
    {
        return [
            'id' => $owner->id,
            'uuid' => $owner->uuid,
            'first_name' => $owner->first_name,
            'last_name' => $owner->last_name,
            'name' => $owner->fullName(),
            'company' => $owner->company,
            'email' => $owner->email,
            'phone' => $owner->phone,
            'street' => $owner->street,
            'postal_code' => $owner->postal_code,
            'city' => $owner->city,
            'property_count' => $owner->property_count,
            'status' => $owner->status->value,
            'status_label' => $owner->status->label(),
            'last_contacted_at' => $owner->last_contacted_at?->toIso8601String(),
            'notes' => $owner->notes,
            'lead' => $owner->lead === null ? null : ['uuid' => $owner->lead->uuid, 'reference' => $owner->lead->reference, 'status_label' => $owner->lead->status->label()],
            'creator' => $owner->creator?->name,
            'creator_avatar' => $owner->creator?->avatar,
            'created_at' => $owner->created_at?->toIso8601String(),
        ];
    }
}
