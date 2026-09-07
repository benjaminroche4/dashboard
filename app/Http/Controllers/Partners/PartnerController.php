<?php

declare(strict_types=1);

namespace App\Http\Controllers\Partners;

use App\Actions\Partners\CreatePartner;
use App\Actions\Partners\DeletePartner;
use App\Actions\Partners\UpdatePartner;
use App\Data\PartnerData;
use App\Enums\PartnerType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partners\StorePartnerRequest;
use App\Http\Requests\Partners\UpdatePartnerRequest;
use App\Models\LeadPartner;
use App\Models\Partner;
use App\Models\PartnerContact;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Partner::class);

        $partners = Partner::query()
            ->with(['creator', 'contacts'])
            ->withCount('leadLinks')
            ->orderBy('name')
            ->get()
            ->map(fn (Partner $partner): array => self::summary($partner))
            ->all();

        return Inertia::render('partners/index', ['partners' => $partners, 'types' => PartnerType::options()]);
    }

    public function show(Partner $partner): Response
    {
        $this->authorize('view', $partner);

        $partner->load(['creator', 'contacts', 'leadLinks.lead']);
        $partner->loadCount('leadLinks');

        return Inertia::render('partners/show', [
            'partner' => [
                ...self::summary($partner),
                // Dossiers sur lesquels le partenaire intervient, du plus récent au plus ancien.
                'leads' => $partner->leadLinks->map(fn (LeadPartner $link): array => [
                    'id' => $link->id,
                    'uuid' => $link->lead->uuid,
                    'name' => $link->lead->fullName(),
                    'status_label' => $link->lead->status->label(),
                    'role_label' => $link->role->label(),
                    'at' => $link->created_at?->toIso8601String(),
                ])->all(),
            ],
            'types' => PartnerType::options(),
        ]);
    }

    /** Recherche ⌘K : nom, interlocuteur, e-mail ou téléphone. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Partner::class);

        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json([]);
        }

        return response()->json(Partner::query()
            ->with('contacts')
            ->where(function ($builder) use ($query): void {
                $builder->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%")
                    ->orWhereHas('contacts', function ($contacts) use ($query): void {
                        $contacts->whereRaw("first_name || ' ' || last_name like ?", ["%{$query}%"])
                            ->orWhere('email', 'like', "%{$query}%")
                            ->orWhere('phone', 'like', "%{$query}%");
                    });
            })
            ->orderBy('name')
            ->limit(10)
            ->get()
            ->map(fn (Partner $partner): array => [
                'id' => $partner->id,
                'uuid' => $partner->uuid,
                'name' => $partner->name,
                'type' => $partner->type->value,
                'type_label' => $partner->type->label(),
                'contact' => $partner->contacts->first()?->fullName(),
                'url' => route('partners.show', $partner),
            ])
            ->all());
    }

    /** Partenaires partageant l'e-mail ou le téléphone saisis (hors `except`), pour l'alerte doublons. */
    public function duplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Partner::class);

        $except = (int) $request->query('except', 0);

        $name = trim((string) $request->query('name', ''));

        return response()->json(Partner::query()
            ->where(function ($query) use ($request, $name): void {
                $query->matchingContact((string) $request->query('email', ''), (string) $request->query('phone', ''));

                if (mb_strlen($name) >= 3) {
                    $query->orWhere(fn ($named) => $named->named($name));
                }
            })
            ->when($except > 0, fn ($query) => $query->whereKeyNot($except))
            ->orderBy('name')
            ->limit(5)
            ->get()
            ->map(fn (Partner $partner): array => [
                'id' => $partner->id,
                'uuid' => $partner->uuid,
                'name' => $partner->name,
                'agency' => $partner->type->label(),
                'email' => $partner->email,
                'phone' => $partner->phone,
            ])
            ->all());
    }

    public function store(StorePartnerRequest $request, CreatePartner $create): RedirectResponse
    {
        $this->authorize('create', Partner::class);

        $partner = $create->handle(PartnerData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Partenaire :name ajouté.', ['name' => $partner->name])]);

        return back();
    }

    public function update(UpdatePartnerRequest $request, Partner $partner, UpdatePartner $update): RedirectResponse
    {
        $this->authorize('update', $partner);

        $partner = $update->handle($partner, PartnerData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Partenaire :name mis à jour.', ['name' => $partner->name])]);

        return back();
    }

    public function destroy(Partner $partner, DeletePartner $delete): RedirectResponse
    {
        $this->authorize('delete', $partner);

        $name = $partner->name;
        $delete->handle($partner);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Partenaire :name supprimé.', ['name' => $name])]);

        return to_route('partners.index');
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Partner $partner): array
    {
        return [
            'id' => $partner->id,
            'uuid' => $partner->uuid,
            'name' => $partner->name,
            'type' => $partner->type->value,
            'type_label' => $partner->type->label(),
            'email' => $partner->email,
            'phone' => $partner->phone,
            'website' => $partner->website,
            'street' => $partner->street,
            'postal_code' => $partner->postal_code,
            'city' => $partner->city,
            'notes' => $partner->notes,
            'contacts' => $partner->contacts->map(fn (PartnerContact $contact): array => [
                'id' => $contact->id,
                'first_name' => $contact->first_name,
                'last_name' => $contact->last_name,
                'name' => $contact->fullName(),
                'position' => $contact->position,
                'email' => $contact->email,
                'phone' => $contact->phone,
            ])->all(),
            'leads_count' => (int) ($partner->lead_links_count ?? 0),
            'creator' => $partner->creator?->name,
            'creator_avatar' => $partner->creator?->avatar,
            'created_at' => $partner->created_at?->toIso8601String(),
        ];
    }
}
