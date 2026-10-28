<?php

declare(strict_types=1);

namespace App\Http\Controllers\Companies;

use App\Actions\Companies\AddLeadCompanyToDirectory;
use App\Actions\Companies\CreateCompany;
use App\Actions\Companies\DeleteCompany;
use App\Actions\Companies\RemoveCompanyLogo;
use App\Actions\Companies\SendCompanyFollowUp;
use App\Actions\Companies\UpdateCompany;
use App\Actions\Companies\UpdateCompanyLogo;
use App\Data\CompanyData;
use App\Enums\ContactFunction;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Tools\ActivityController;
use App\Http\Requests\Companies\SendCompanyFollowUpRequest;
use App\Http\Requests\Companies\StoreCompanyRequest;
use App\Http\Requests\Companies\UpdateCompanyLogoRequest;
use App\Http\Requests\Companies\UpdateCompanyRequest;
use App\Models\Activity;
use App\Models\Company;
use App\Models\CompanyContact;
use App\Models\Lead;
use App\Support\SearchSql;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Company::class);

        return Inertia::render('companies/index', [
            'companies' => Company::query()
                ->with(['creator', 'contacts'])
                ->withCount('clients')
                ->orderBy('name')
                ->get()
                ->map(fn (Company $company): array => self::summary($company))
                ->all(),
        ]);
    }

    public function show(Request $request, Company $company): Response
    {
        $this->authorize('view', $company);

        $company->load(['creator', 'contacts', 'clients.assignee']);
        $company->loadCount('clients');

        return Inertia::render('companies/show', [
            'company' => [
                ...self::summary($company),
                'clients' => $company->clients->map(fn (Lead $lead): array => self::clientRow($lead))->all(),
            ],
            'functions' => ContactFunction::options(),
            // Dossiers clients encore libres, pour le dialogue « Rattacher un client ».
            'clientOptions' => Lead::query()
                ->where('status', LeadStatus::Converted)
                ->whereNull('company_id')
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ->map(fn (Lead $lead): array => [
                    'id' => $lead->id,
                    'uuid' => $lead->uuid,
                    'name' => $lead->householdName(),
                    'reference' => $lead->reference,
                    'company' => $lead->company,
                ])
                ->all(),
            // Entreprises qui partagent l'e-mail ou le téléphone : doublon probable.
            'duplicates' => Company::query()
                ->whereKeyNot($company->id)
                ->matchingContact($company->email, $company->phone)
                ->limit(5)
                ->get()
                ->map(fn (Company $other): array => ['uuid' => $other->uuid, 'name' => $other->name])
                ->all(),
            'activities' => Activity::query()
                ->with(['actor', 'lead', 'partner'])
                ->where('resource', 'companies')
                ->where('payload->id', $company->id)
                ->latest('created_at')
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity): array => ActivityController::summary($activity))
                ->all(),
        ]);
    }

    /** Recherche ⌘K : nom, contact, e-mail ou téléphone. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Company::class);

        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        return response()->json(Company::query()
            ->with('contacts')
            ->where(function ($builder) use ($query): void {
                $builder->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%")
                    ->orWhereHas('contacts', function ($contacts) use ($query): void {
                        $contacts->where(SearchSql::fullName(), 'like', "%{$query}%")
                            ->orWhere('email', 'like', "%{$query}%");
                    });
            })
            ->orderBy('name')
            ->limit(8)
            ->get()
            ->map(fn (Company $company): array => [
                'id' => $company->id,
                'uuid' => $company->uuid,
                'title' => $company->name,
                'subtitle' => $company->contacts->firstWhere('is_primary', true)?->fullName() ?? $company->contacts->first()?->fullName() ?? $company->city,
                'url' => route('companies.show', $company),
            ])
            ->all());
    }

    /** Entreprises partageant l'e-mail, le téléphone ou le nom saisis (hors `except`), pour l'alerte doublons. */
    public function duplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Company::class);

        $except = (int) $request->query('except', 0);
        $name = trim((string) $request->query('name', ''));

        return response()->json(Company::query()
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
            ->map(fn (Company $company): array => [
                'id' => $company->id,
                'uuid' => $company->uuid,
                'name' => $company->name,
                'agency' => $company->city,
                'email' => $company->email,
                'phone' => $company->phone,
            ])
            ->all());
    }

    public function store(StoreCompanyRequest $request, CreateCompany $create): RedirectResponse
    {
        $this->authorize('create', Company::class);

        $company = $create->handle(CompanyData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Entreprise :name ajoutée.', ['name' => $company->name])]);

        return to_route('companies.show', $company);
    }

    /** Fait entrer la société d'un lead dans l'annuaire, sans ressaisie, et y rattache le lead. */
    public function fromLead(Request $request, Lead $lead, AddLeadCompanyToDirectory $add): RedirectResponse
    {
        $this->authorize('create', Company::class);

        $company = $add->handle($lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name figure dans l’annuaire des entreprises.', ['name' => $company->name])]);

        return to_route('companies.show', $company);
    }

    public function update(UpdateCompanyRequest $request, Company $company, UpdateCompany $update): RedirectResponse
    {
        $this->authorize('update', $company);

        $company = $update->handle($company, CompanyData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Entreprise :name mise à jour.', ['name' => $company->name])]);

        return back();
    }

    /** Remplace le logo (image de profil) de l'entreprise. */
    public function updateLogo(UpdateCompanyLogoRequest $request, Company $company, UpdateCompanyLogo $update): RedirectResponse
    {
        $this->authorize('update', $company);

        $logo = $request->file('logo');

        if ($logo instanceof UploadedFile) {
            $update->handle($company, $logo, $request->user());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Logo de :name mis à jour.', ['name' => $company->name])]);

        return back();
    }

    /** Retire le logo de l'entreprise. */
    public function destroyLogo(Request $request, Company $company, RemoveCompanyLogo $remove): RedirectResponse
    {
        $this->authorize('update', $company);

        $remove->handle($company, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Logo de :name retiré.', ['name' => $company->name])]);

        return back();
    }

    /** E-mail de suivi libre à l'entreprise ou à ses contacts, un par personne. */
    public function followUp(SendCompanyFollowUpRequest $request, Company $company, SendCompanyFollowUp $send): RedirectResponse
    {
        $company->loadMissing('contacts');
        $recipients = $request->recipients();

        $send->handle($company, $recipients, (string) $request->validated('subject'), (string) $request->validated('message'), $request->user());

        $names = implode(', ', array_column($recipients, 'email'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('E-mail envoyé à :email.', ['email' => $names])]);

        return back();
    }

    public function destroy(Request $request, Company $company, DeleteCompany $delete): RedirectResponse
    {
        $this->authorize('delete', $company);

        $name = $company->name;
        $delete->handle($company, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Entreprise :name supprimée.', ['name' => $name])]);

        return to_route('companies.index');
    }

    /**
     * Dossier client rattaché, pour la fiche de l'entreprise.
     *
     * @return array<string, mixed>
     */
    public static function clientRow(Lead $lead): array
    {
        return [
            'id' => $lead->id,
            'uuid' => $lead->uuid,
            'name' => $lead->householdName(),
            'reference' => $lead->reference,
            'status_label' => $lead->status->label(),
            'is_closed' => $lead->isClosed(),
            'offer' => $lead->offer?->value,
            'offer_label' => $lead->offer?->label(),
            'arrival_at' => $lead->arrival_at?->toDateString(),
            'assignee' => $lead->assignee?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Company $company): array
    {
        return [
            'id' => $company->id,
            'uuid' => $company->uuid,
            'name' => $company->name,
            'email' => $company->email,
            'phone' => $company->phone,
            'website' => $company->website,
            'street' => $company->street,
            'postal_code' => $company->postal_code,
            'city' => $company->city,
            'notes' => $company->notes,
            'logo' => $company->logo,
            'contacts' => $company->contacts->map(fn (CompanyContact $contact): array => [
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
            'primary_contacts_count' => $company->contacts->where('is_primary', true)->count(),
            'clients_count' => (int) ($company->clients_count ?? 0),
            'creator' => $company->creator?->name,
            'creator_avatar' => $company->creator?->avatar,
            'created_at' => $company->created_at?->toIso8601String(),
        ];
    }
}
