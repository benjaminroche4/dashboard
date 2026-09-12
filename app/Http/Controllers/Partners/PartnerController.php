<?php

declare(strict_types=1);

namespace App\Http\Controllers\Partners;

use App\Actions\Directory\SendDirectoryWelcome;
use App\Actions\Directory\ToggleFavorite;
use App\Actions\Partners\CreatePartner;
use App\Actions\Partners\DeletePartner;
use App\Actions\Partners\DeletePartners;
use App\Actions\Partners\SetPartnerRelationshipQuality;
use App\Actions\Partners\TouchPartnerContact;
use App\Actions\Partners\UpdatePartner;
use App\Data\PartnerData;
use App\Enums\ContactFunction;
use App\Enums\PartnerType;
use App\Enums\RelationshipQuality;
use App\Events\DashboardUpdated;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Tools\ActivityController;
use App\Http\Requests\Partners\BulkPartnersRequest;
use App\Http\Requests\Partners\SendPartnerWelcomeRequest;
use App\Http\Requests\Partners\StorePartnerRequest;
use App\Http\Requests\Partners\TouchPartnerRequest;
use App\Http\Requests\Partners\UpdatePartnerRequest;
use App\Models\Activity;
use App\Models\Invoice;
use App\Models\LeadPartner;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\Quote;
use App\Services\DistrictStaticMap;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Partner::class);

        $user = $request->user();

        $partners = Partner::query()
            ->with(['creator', 'contacts'])
            ->withCount('leadLinks')
            ->when($user !== null, fn (Builder $query): Builder => $query->withFavoriteOf($user))
            // Les favoris du membre en tête, puis par nom.
            ->orderByDesc('is_favorite')
            ->orderBy('name')
            ->get()
            ->map(fn (Partner $partner): array => self::summary($partner))
            ->all();

        return Inertia::render('partners/index', [
            'partners' => $partners,
            'types' => PartnerType::options(),
            'favoritesCount' => $user === null
                ? 0
                : Partner::query()->whereHas('favorites', fn (Builder $favorites): Builder => $favorites->where('user_id', $user->id))->count(),
        ]);
    }

    /** Pose ou retire l'étoile du membre connecté sur ce partenaire (favori personnel). */
    public function favorite(Request $request, Partner $partner, ToggleFavorite $toggle): RedirectResponse
    {
        $this->authorize('view', $partner);

        $toggle->handle($request->user(), $partner);

        return back();
    }

    public function show(Request $request, Partner $partner): Response
    {
        $this->authorize('view', $partner);

        $partner->load(['creator', 'contacts', 'leadLinks.lead', 'quotes', 'invoices']);
        $partner->loadCount('leadLinks');
        $partner->loadFavoriteOf($request->user());

        $primary = $partner->primaryContact();

        return Inertia::render('partners/show', [
            'partner' => [
                ...self::summary($partner),
                'contacts_count' => $partner->contacts->count(),
                // Interlocuteur à joindre d'abord : celui marqué principal, sinon le premier.
                'primary_contact' => $primary instanceof PartnerContact ? [
                    'id' => $primary->id,
                    'name' => $primary->fullName(),
                    'position' => $primary->position?->label(),
                    'email' => $primary->email,
                    'phone' => $primary->phone,
                ] : null,
                // Rôles tenus par le partenaire, sans doublon, pour la carte Dossiers.
                'roles' => $partner->leadLinks
                    ->map(fn (LeadPartner $link): string => $link->role->label())
                    ->unique()
                    ->values()
                    ->all(),
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
            // Historique commercial avec ce partenaire : ce qu'on lui a devisé
            // et facturé, du plus récent au plus ancien.
            'quotes' => $partner->quotes->map(fn (Quote $quote): array => [
                'id' => $quote->id,
                'uuid' => $quote->uuid,
                'number' => $quote->number,
                'client_name' => $quote->client_name,
                'amount_cents' => $quote->amount_cents,
                'currency' => $quote->currency->value,
                'status' => $quote->status->value,
                'status_label' => $quote->status->label(),
                'issued_at' => $quote->issued_at->toDateString(),
                'valid_until' => $quote->valid_until->toDateString(),
            ])->all(),
            'invoices' => $partner->invoices->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'uuid' => $invoice->uuid,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'amount_cents' => $invoice->amount_cents,
                'currency' => $invoice->currency->value,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at->toDateString(),
            ])->all(),
            // Devis et factures ne sont visibles et créables que par qui en a le droit.
            'can' => [
                'quotes' => $request->user()?->can('create', Quote::class) ?? false,
                'invoices' => $request->user()?->can('create', Invoice::class) ?? false,
            ],
            'types' => PartnerType::options(),
            'qualities' => RelationshipQuality::options(),
            'functions' => ContactFunction::options(),
            // Carte statique de l'adresse, si la clé dédiée est configurée.
            'mapUrl' => resolve(DistrictStaticMap::class)->place($partner->latitude, $partner->longitude, $this->addressLine($partner)),
            // Partenaires qui partagent l'e-mail ou le téléphone : doublon probable.
            'duplicates' => Partner::query()
                ->whereKeyNot($partner->id)
                ->matchingContact($partner->email, $partner->phone)
                ->limit(5)
                ->get()
                ->map(fn (Partner $other): array => ['uuid' => $other->uuid, 'name' => $other->name, 'type_label' => $other->type->label()])
                ->all(),
            // Journal : les dernières actions du backoffice sur ce partenaire.
            'activities' => Activity::query()
                ->with(['actor', 'lead', 'partner'])
                ->where('partner_id', $partner->id)
                ->latest('created_at')
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity): array => ActivityController::summary($activity))
                ->all(),
        ]);
    }

    /** Note un échange avec le partenaire, et la qualité de la relation. */
    public function touch(TouchPartnerRequest $request, Partner $partner, TouchPartnerContact $touch, SetPartnerRelationshipQuality $setQuality): RedirectResponse
    {
        $this->authorize('update', $partner);

        $at = $request->validated('at');
        $touch->handle($partner, is_string($at) ? CarbonImmutable::parse($at) : null, $request->user());

        $quality = $request->validated('relationship_quality');

        if ($quality !== null) {
            $setQuality->handle($partner, RelationshipQuality::from((string) $quality), $request->user());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Échange noté.')]);

        return back();
    }

    /** Renvoie l'e-mail de bienvenue au partenaire (déjà envoyé à sa création). */
    /** Renvoie l'e-mail de bienvenue aux adresses choisies parmi celles du partenaire. */
    public function welcome(SendPartnerWelcomeRequest $request, Partner $partner, SendDirectoryWelcome $send): RedirectResponse
    {
        $partner->loadMissing('contacts');
        $recipients = $request->recipients();

        // Un e-mail par personne : il s'adresse à elle, pas à une liste.
        foreach ($recipients as $recipient) {
            $send->handle($recipient['email'], $recipient['name'], "partenaire · {$partner->type->label()}", $partner->phone, $request->user());
        }

        $names = implode(', ', array_column($recipients, 'email'));
        event(new DashboardUpdated('partners', ['id' => $partner->id], "a renvoyé l'e-mail de bienvenue à {$names}", $request->user()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('E-mail de bienvenue renvoyé à :email.', ['email' => $names])]);

        return back();
    }

    /** Adresse du partenaire sur une ligne, pour la carte statique. */
    private function addressLine(Partner $partner): ?string
    {
        $line = trim(implode(', ', array_filter([
            $partner->street,
            trim(($partner->postal_code ?? '').' '.($partner->city ?? '')),
        ])));

        return $line === '' ? null : $line;
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

        $notify = $request->boolean('notify');
        $partner = $create->handle(PartnerData::from($request->validated()), $request->user(), $notify);

        $message = $notify && $partner->email !== null
            ? __('Partenaire :name ajouté, e-mail de bienvenue envoyé.', ['name' => $partner->name])
            : __('Partenaire :name ajouté.', ['name' => $partner->name]);
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    public function update(UpdatePartnerRequest $request, Partner $partner, UpdatePartner $update): RedirectResponse
    {
        $this->authorize('update', $partner);

        $partner = $update->handle($partner, PartnerData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Partenaire :name mis à jour.', ['name' => $partner->name])]);

        return back();
    }

    /** Suppression groupée depuis la liste (admins). */
    public function bulkDestroy(BulkPartnersRequest $request, DeletePartners $deletePartners): RedirectResponse
    {
        $this->authorize('delete', Partner::class);

        $count = $deletePartners->handle(Partner::query()->whereIn('id', $request->ids())->get());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count partenaire(s) supprimé(s).', ['count' => $count])]);

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
     * Partenaire rattaché à un devis ou à une facture, pour la carte du document.
     *
     * @return array{id: int, uuid: string, name: string, type_label: string}|null
     */
    public static function linkSummary(?Partner $partner): ?array
    {
        return $partner instanceof Partner ? [
            'id' => $partner->id,
            'uuid' => $partner->uuid,
            'name' => $partner->name,
            'type_label' => $partner->type->label(),
        ] : null;
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
            'latitude' => $partner->latitude,
            'longitude' => $partner->longitude,
            'notes' => $partner->notes,
            // Suivi de la relation, comme pour les agents immobiliers.
            'relationship_quality' => $partner->relationship_quality?->value,
            'relationship_quality_label' => $partner->relationship_quality?->label(),
            'last_contacted_at' => $partner->last_contacted_at?->toIso8601String(),
            'is_favorite' => (bool) $partner->is_favorite,
            'contacts' => $partner->contacts->map(fn (PartnerContact $contact): array => [
                'id' => $contact->id,
                'first_name' => $contact->first_name,
                'last_name' => $contact->last_name,
                'name' => $contact->fullName(),
                'position' => $contact->position?->label(),
                'position_value' => $contact->position?->value,
                'is_primary' => (bool) $contact->is_primary,
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
