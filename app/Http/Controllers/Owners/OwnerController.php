<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owners;

use App\Actions\Owners\AddLeadToDirectory;
use App\Actions\Owners\CreateOwner;
use App\Actions\Owners\DeleteOwner;
use App\Actions\Owners\DeleteOwners;
use App\Actions\Owners\ImportOwners;
use App\Actions\Owners\TouchOwnerContact;
use App\Actions\Owners\UpdateOwner;
use App\Data\OwnerData;
use App\Data\OwnerImportRowData;
use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Enums\OwnerKind;
use App\Enums\PropertyStatus;
use App\Enums\VisitStatus;
use App\Enums\WebsiteHelpType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Properties\PropertyController;
use App\Http\Requests\Owners\BulkOwnersRequest;
use App\Http\Requests\Owners\ImportOwnersRequest;
use App\Http\Requests\Owners\IndexOwnersRequest;
use App\Http\Requests\Owners\StoreOwnerRequest;
use App\Http\Requests\Owners\TouchOwnerRequest;
use App\Http\Requests\Owners\UpdateOwnerRequest;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Visit;
use App\Services\DistrictStaticMap;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

class OwnerController extends Controller
{
    use AuthorizesRequests;

    /** Annuaire des propriétaires : qui possède quoi, particuliers et sociétés. */
    public function index(IndexOwnersRequest $request): Response
    {
        $this->authorize('viewAny', Owner::class);

        $search = $request->search();
        $kinds = $request->kinds();
        $holdings = $request->holdings();

        $paginator = Owner::query()
            ->with('creator')
            ->withCount('properties')
            ->when($search !== '', fn (Builder $query): Builder => $query->where(fn (Builder $where): Builder => $where
                ->whereRaw("first_name || ' ' || last_name like ?", ["%{$search}%"])
                ->orWhere('company', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")))
            ->when($kinds !== [], fn (Builder $query): Builder => $query->whereIn('kind', $kinds))
            // Les deux cases cochées reviennent à ne pas filtrer.
            ->when($holdings === ['with'], fn (Builder $query): Builder => $query->has('properties'))
            ->when($holdings === ['without'], fn (Builder $query): Builder => $query->doesntHave('properties'))
            ->tap(fn (Builder $query) => $this->sortOwners($query, $request->sort(), $request->direction()))
            ->paginate(IndexOwnersRequest::PER_PAGE)
            ->withQueryString();

        return Inertia::render('owners/index', [
            'owners' => $paginator->getCollection()->map(fn (Owner $owner): array => self::summary($owner))->all(),
            'kinds' => OwnerKind::options(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => $request->filters(),
            // Comptés sur tout l'annuaire, pas seulement la page affichée.
            'kindCounts' => Owner::query()
                ->selectRaw('kind, count(*) as total')
                ->groupBy('kind')
                ->pluck('total', 'kind')
                ->all(),
            'holdingCounts' => [
                'with' => Owner::query()->has('properties')->count(),
                'without' => Owner::query()->doesntHave('properties')->count(),
            ],
            'propertiesCount' => Property::query()->whereNotNull('owner_id')->count(),
            'realtimeOnly' => ['owners', 'pagination', 'kindCounts', 'holdingCounts', 'propertiesCount'],
        ]);
    }

    /**
     * @param  Builder<Owner>  $query
     * @param  'asc'|'desc'  $direction
     */
    private function sortOwners(Builder $query, string $sort, string $direction): void
    {
        match ($sort) {
            // Le nom affiché : la raison sociale d'une société, le nom sinon.
            'name' => $query->orderByRaw("lower(coalesce(nullif(company, ?), last_name || ' ' || first_name)) {$direction}", ['']),
            'properties_count' => $query->orderBy('properties_count', $direction),
            // « Jamais contacté » est le plus ancien de tous : en tête du tri
            // croissant, en queue du décroissant.
            'last_contacted_at' => $query
                ->orderByRaw('last_contacted_at is null '.($direction === 'asc' ? 'desc' : 'asc'))
                ->orderBy('last_contacted_at', $direction),
            default => $query->orderBy($sort, $direction),
        };

        $query->orderBy('id');
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

        $owner->load(['creator', 'lead.assignee', 'properties.agent.agency', 'properties.creator']);
        $owner->loadCount('properties');
        $owner->properties->loadCount('visits');

        return Inertia::render('owners/show', [
            'owner' => self::summary($owner),
            'properties' => $owner->properties
                ->sortByDesc('created_at')
                ->values()
                ->map(fn (Property $property): array => PropertyController::summary($property))
                ->all(),
            // État du parc en trois chiffres : ce que la liste des biens ne dit pas.
            'stats' => $this->parcStats($owner),
            'kinds' => OwnerKind::options(),
            // Carte statique de l'adresse du bien, si la clé Maps Static dédiée est configurée.
            'mapUrl' => resolve(DistrictStaticMap::class)->place(null, null, $this->addressLine($owner)),
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
                'subtitle' => $owner->contactName() ?? $owner->kind->label(),
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

    /** Suppression groupée depuis la liste (admins). */
    public function bulkDestroy(BulkOwnersRequest $request, DeleteOwners $deleteOwners): RedirectResponse
    {
        $this->authorize('delete', Owner::class);

        $count = $deleteOwners->handle(Owner::query()->whereIn('id', $request->ids())->get());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count propriétaire(s) supprimé(s).', ['count' => $count])]);

        return back();
    }

    public function destroy(Owner $owner, DeleteOwner $delete): RedirectResponse
    {
        $this->authorize('delete', $owner);

        $name = $owner->fullName();
        $delete->handle($owner);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Propriétaire :name supprimé.', ['name' => $name])]);

        return back();
    }

    /** Importe des propriétaires collés depuis un tableur. */
    public function import(ImportOwnersRequest $request, ImportOwners $import): RedirectResponse
    {
        $this->authorize('create', Owner::class);

        /** @var array<int, array<string, mixed>> $rows */
        $rows = $request->validated('rows');
        $result = $import->handle(array_map(OwnerImportRowData::from(...), array_values($rows)), $request->user());

        Inertia::flash('toast', $result['created'] > 0
            ? ['type' => 'success', 'message' => __(':count propriétaire(s) importé(s), :skipped ignoré(s) (déjà connus).', ['count' => $result['created'], 'skipped' => $result['skipped']])]
            : ['type' => 'warning', 'message' => __('Aucun propriétaire importé : les :count ligne(s) étaient déjà connues.', ['count' => $result['skipped']])]);

        return back();
    }

    /** Note un échange avec le propriétaire, pour suivre sa fraîcheur. */
    public function contact(TouchOwnerRequest $request, Owner $owner, TouchOwnerContact $touch): RedirectResponse
    {
        $this->authorize('update', $owner);

        $at = $request->validated('at');
        $touch->handle($owner, is_string($at) ? Date::parse($at)->toImmutable() : null, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Échange noté avec :name.', ['name' => $owner->fullName()])]);

        return back();
    }

    /** Fait entrer un lead propriétaire dans l'annuaire, sans ressaisie. */
    public function fromLead(Request $request, Lead $lead, AddLeadToDirectory $add): RedirectResponse
    {
        $this->authorize('create', Owner::class);

        $owner = $add->handle($lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name figure dans l’annuaire des propriétaires.', ['name' => $owner->fullName()])]);

        return to_route('owners.show', $owner);
    }

    /**
     * Parc d'un propriétaire : ce qui est ouvert, ce qui est loué, le total des
     * loyers et la dernière visite, tous biens confondus.
     *
     * @return array{properties: int, open: int, rented: int, rent_cents: int, last_visit_at: string|null}
     */
    private function parcStats(Owner $owner): array
    {
        $rent = 0;
        $open = 0;
        $rented = 0;

        foreach ($owner->properties as $property) {
            $rent += (int) $property->rent_cents;

            if ($property->status->isOpen()) {
                $open++;
            }

            if ($property->status === PropertyStatus::Rented) {
                $rented++;
            }
        }

        $lastVisit = Visit::query()
            ->whereIn('property_id', $owner->properties->modelKeys())
            ->where('status', '!=', VisitStatus::Cancelled)
            ->where('scheduled_at', '<=', now())
            ->max('scheduled_at');

        return [
            'properties' => $owner->properties->count(),
            'open' => $open,
            'rented' => $rented,
            'rent_cents' => $rent,
            'last_visit_at' => is_string($lastVisit) ? Date::parse($lastVisit)->toIso8601String() : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Owner $owner): array
    {
        return [
            'id' => $owner->id,
            'uuid' => $owner->uuid,
            'kind' => $owner->kind->value,
            'kind_label' => $owner->kind->label(),
            'first_name' => $owner->first_name,
            'last_name' => $owner->last_name,
            'name' => $owner->fullName(),
            'contact_name' => $owner->contactName(),
            'company' => $owner->company,
            'email' => $owner->email,
            'phone' => $owner->phone,
            'street' => $owner->street,
            'postal_code' => $owner->postal_code,
            'city' => $owner->city,
            // Nombre réel de biens de l'annuaire rattachés au propriétaire.
            'properties_count' => (int) ($owner->properties_count ?? 0),
            'notes' => $owner->notes,
            'last_contacted_at' => $owner->last_contacted_at?->toIso8601String(),
            'lead' => $owner->relationLoaded('lead') && $owner->lead !== null ? [
                'id' => $owner->lead->id,
                'uuid' => $owner->lead->uuid,
                'name' => $owner->lead->fullName(),
                'reference' => $owner->lead->reference,
                'status_label' => $owner->lead->status->ownerLabel(),
                'assignee' => $owner->lead->assignee?->name,
            ] : null,
            'creator' => $owner->creator?->name,
            'creator_avatar' => $owner->creator?->avatar,
            'created_at' => $owner->created_at?->toIso8601String(),
        ];
    }

    /** Adresse du propriétaire sur une ligne, pour la carte statique. */
    private function addressLine(Owner $owner): ?string
    {
        $line = trim(implode(', ', array_filter([
            $owner->street,
            trim(($owner->postal_code ?? '').' '.($owner->city ?? '')),
        ])));

        return $line === '' ? null : $line;
    }
}
