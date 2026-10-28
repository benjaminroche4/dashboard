<?php

declare(strict_types=1);

namespace App\Http\Controllers\Leads;

use App\Actions\Clients\SuggestClientProperties;
use App\Actions\Leads\AddLeadNote;
use App\Actions\Leads\AssignLead;
use App\Actions\Leads\ConvertLeadToClient;
use App\Actions\Leads\CreateLead;
use App\Actions\Leads\DeleteLead;
use App\Actions\Leads\DeleteLeadNote;
use App\Actions\Leads\MoveLeadSegment;
use App\Actions\Leads\QualifyLead;
use App\Actions\Leads\ScheduleLeadRecontact;
use App\Actions\Leads\ScheduleLeadVisio;
use App\Actions\Leads\SendLeadDossier;
use App\Actions\Leads\SendLeadPropertyMatch;
use App\Actions\Leads\SetLeadAgent;
use App\Actions\Leads\SetLeadQualification;
use App\Actions\Leads\SubmitLeadVisioReport;
use App\Actions\Leads\TouchLeadContact;
use App\Actions\Leads\UpdateLead;
use App\Actions\Leads\UpdateLeadFields;
use App\Actions\Leads\UpdateLeadNote;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Data\LeadInboundMessageData;
use App\Data\LeadVerdictData;
use App\Enums\Currency;
use App\Enums\EmploymentStatus;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadLossReason;
use App\Enums\LeadSegment;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\PartnerRole;
use App\Enums\PaymentPlan;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Enums\WebsiteHelpType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Owners\OwnerLeadController;
use App\Http\Controllers\RealEstate\AgentController;
use App\Http\Requests\Leads\AssignLeadRequest;
use App\Http\Requests\Leads\MoveLeadSegmentRequest;
use App\Http\Requests\Leads\QualifyLeadRequest;
use App\Http\Requests\Leads\ScheduleLeadRecontactRequest;
use App\Http\Requests\Leads\ScheduleLeadVisioRequest;
use App\Http\Requests\Leads\SendLeadDossierRequest;
use App\Http\Requests\Leads\SendLeadPropertyMatchRequest;
use App\Http\Requests\Leads\SetLeadAgentRequest;
use App\Http\Requests\Leads\StoreLeadNoteRequest;
use App\Http\Requests\Leads\StoreLeadRequest;
use App\Http\Requests\Leads\StoreLeadVisioReportRequest;
use App\Http\Requests\Leads\UpdateLeadFieldsRequest;
use App\Http\Requests\Leads\UpdateLeadNoteRequest;
use App\Http\Requests\Leads\UpdateLeadRequest;
use App\Http\Requests\Leads\UpdateLeadStatusRequest;
use App\Models\Agent;
use App\Models\DocumentRequest;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\LeadPartner;
use App\Models\LeadStatusChange;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\Quote;
use App\Models\User;
use App\Services\PaymentLinks;
use App\Services\Yousign;
use App\Support\PersonName;
use App\Support\SearchSql;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    use AuthorizesRequests;

    /** Liste des leads ; les archivés ne sont chargés qu'à la demande (`?archived=1`). */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        $withArchived = $request->boolean('archived');
        // Les leads propriétaires ont leur propre liste : un lead déplacé
        // vers ce segment doit quitter celle-ci, pas s'afficher des deux côtés.
        $leads = Lead::query()
            ->with(['author', 'assignee'])
            // `!=` laisserait de côté les leads sans type : en SQL, une
            // comparaison avec NULL n'est jamais vraie.
            ->where(fn (Builder $query): Builder => $query
                ->whereNull('help_type')
                ->orWhere('help_type', '!=', WebsiteHelpType::RentalManagement))
            ->unless($withArchived, fn (Builder $query): Builder => $query->where('status', '!=', LeadStatus::Archived))
            ->orderBy('position')
            ->latest()
            ->get()
            ->map(fn (Lead $lead): array => self::summary($lead))
            ->all();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'archived' => [
                'loaded' => $withArchived,
                // Même segment que la liste : le compte des archivés aussi.
                'count' => Lead::query()
                    ->where('status', LeadStatus::Archived)
                    ->where(fn (Builder $query): Builder => $query
                        ->whereNull('help_type')
                        ->orWhere('help_type', '!=', WebsiteHelpType::RentalManagement))
                    ->count(),
            ],
            'statuses' => self::statuses(),
            'offers' => self::offers(),
            'lossReasons' => LeadLossReason::options(),
            // Temps réel : ne recharger que la liste, pas toute la page.
            'realtimeOnly' => ['leads'],
        ]);
    }

    /**
     * Lead rattaché à un document (devis, facture, liste de pièces), tel que le
     * front l'affiche : un lead converti est un dossier client, et se rouvre
     * comme tel.
     *
     * @return array{id: int, uuid: string, name: string, is_client: bool}|null
     */
    public static function linkSummary(?Lead $lead): ?array
    {
        if (! $lead instanceof Lead) {
            return null;
        }

        return [
            'id' => $lead->id,
            'uuid' => $lead->uuid,
            'name' => $lead->fullName(),
            'is_client' => $lead->status === LeadStatus::Converted,
        ];
    }

    /**
     * Note interne telle que l'affiche le fil d'activité (fiche lead **et**
     * dossier client, qui partagent les mêmes bulles et les mêmes routes).
     *
     * @return array{id: int, uuid: string, body: string, kind: string, by: string|null, avatar: string|null, mine: bool, can_edit: bool, can_delete: bool, at: string|null}
     */
    public static function note(LeadNote $note): array
    {
        return [
            'id' => $note->id,
            'uuid' => $note->uuid,
            'body' => $note->body,
            // Suivi écrit par l'application, ou note de l'équipe : les deux
            // se lisent séparément dans le fil d'activité.
            'kind' => $note->kind->value,
            'by' => $note->author?->name,
            'avatar' => $note->author?->avatar,
            'mine' => $note->user_id === Auth::id(),
            'can_edit' => Auth::user()?->can('update', $note) ?? false,
            'can_delete' => Auth::user()?->can('delete', $note) ?? false,
            'at' => $note->created_at?->toIso8601String(),
        ];
    }

    /** Doublons potentiels pendant la saisie : même e-mail ou même téléphone. */
    public function duplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        return response()->json($this->findDuplicates(
            (string) $request->query('email', ''),
            (string) $request->query('phone', ''),
            (int) $request->query('except', 0),
        ));
    }

    /**
     * Leads partageant le même e-mail ou la même fin de numéro (hors `$except`).
     *
     * @return list<array{id: int, name: string, email: string|null, phone: string|null, status_label: string, url: string}>
     */
    private function findDuplicates(?string $email, ?string $phone, int $except = 0): array
    {
        $email = mb_strtolower(trim((string) $email));
        $phone = preg_replace('/\D+/', '', (string) $phone) ?? '';

        if ($email === '' && strlen($phone) < 6) {
            return [];
        }

        return array_values(Lead::query()
            ->when($except > 0, fn ($query) => $query->whereKeyNot($except))
            ->where(function ($query) use ($email, $phone): void {
                if ($email !== '') {
                    $query->whereRaw('lower(email) = ?', [$email]);
                }

                if (strlen($phone) >= 6) {
                    // Compare les chiffres seuls : « +33 6 12 » et « 0612 » se rejoignent sur la fin.
                    $query->orWhereRaw("replace(replace(replace(replace(phone, ' ', ''), '.', ''), '-', ''), '+', '') like ?", ['%'.substr($phone, -9)]);
                }
            })
            ->limit(5)
            ->get()
            ->map(fn (Lead $lead): array => [
                'id' => $lead->id,
                'uuid' => $lead->uuid,
                'name' => $lead->fullName(),
                'email' => $lead->email,
                'phone' => $lead->phone,
                'status_label' => $lead->status->label(),
                'url' => route('leads.show', $lead),
            ])
            ->all());
    }

    /** Recherche ⌘K : les dix leads dont le nom ou l'e-mail contient la saisie. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json([]);
        }

        $leads = Lead::query()
            ->where(function ($builder) use ($query): void {
                $builder->where(SearchSql::fullName(), 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%")
                    ->orWhere('reference', 'like', "%{$query}%")
                    ->orWhere('company', 'like', "%{$query}%")
                    ->orWhere('origin_city', 'like', "%{$query}%");
            })
            ->orderBy('position')
            ->limit(10)
            ->get()
            ->map(fn (Lead $lead): array => [
                'id' => $lead->id,
                'uuid' => $lead->uuid,
                'reference' => $lead->reference,
                'company' => $lead->company,
                'name' => $lead->status === LeadStatus::Converted ? $lead->householdName() : $lead->fullName(),
                'email' => $lead->email,
                'status_label' => $lead->status->label(),
                // Converti : c'est un dossier client, pas un lead à travailler.
                'is_client' => $lead->status === LeadStatus::Converted,
                'url' => route('leads.show', $lead),
            ])
            ->all();

        return response()->json($leads);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Lead::class);

        // `?segment=owner` (menu Propriétaires) : le lead rejoint « Leads propriétaires ».
        $segment = LeadSegment::tryFrom((string) $request->query('segment')) ?? LeadSegment::Tenant;

        // `?name=Léa Durand` (palette ⌘K sans résultat) : le nom est déjà saisi.
        $name = trim((string) $request->query('name', ''));
        $words = $name === '' ? [] : (preg_split('/\s+/', PersonName::capitalize($name)) ?: []);

        return Inertia::render('leads/create', [
            ...$this->formProps(),
            'segment' => $segment->value,
            'prefill' => $words === [] ? null : [
                'first_name' => $words[0],
                'last_name' => implode(' ', array_slice($words, 1)),
            ],
        ]);
    }

    public function store(StoreLeadRequest $request, CreateLead $createLead): RedirectResponse
    {
        $data = LeadData::from($request->validated());
        $lead = $createLead->handle($data, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name ajouté.', ['name' => $lead->fullName()])]);

        return $data->segment === LeadSegment::Owner ? to_route('owners.leads') : to_route('leads.index');
    }

    public function show(Request $request, Lead $lead, PaymentLinks $paymentLinks, Yousign $yousign, SuggestClientProperties $suggestProperties): Response
    {
        $this->authorize('view', $lead);

        return Inertia::render('leads/show', [
            ...$this->detail($lead),
            // Combien de biens de l'annuaire correspondent à la recherche :
            // le chiffre que l'e-mail « n biens correspondent » annonce.
            'matchingCount' => count($suggestProperties->handle($lead, 50)),
            'statuses' => self::statuses(),
            'recontactChannels' => RecontactChannel::options(),
            'lossReasons' => LeadLossReason::options(),
            // Listes des champs modifiables en place dans le bloc Projet.
            'editOptions' => [
                // Le prix à côté de la formule : on choisit une offre en sachant ce qu'elle coûte.
                'offers' => array_map(fn (array $offer): array => [
                    'value' => $offer['value'],
                    'label' => $offer['label'].' · '.number_format($offer['price_cents'] / 100, 0, ',', ' ').' €',
                ], self::offers()),
                'currencies' => array_map(fn (Currency $currency): array => ['value' => $currency->value, 'label' => $currency->label()], Currency::cases()),
                'propertyTypes' => PropertyType::options(),
                'durations' => LeadDuration::options(),
                'guarantors' => GuarantorType::options(),
                'furnishedOptions' => Furnished::options(),
                'employmentStatuses' => EmploymentStatus::options(),
                'languages' => LeadLanguage::options(),
                'sources' => array_map(
                    fn (LeadSource $source): array => ['value' => $source->value, 'label' => $source->label()],
                    LeadSource::cases(),
                ),
            ],
            // Annuaire des agents immobiliers pour la carte « Agent en contact ».
            'agents' => Agent::query()->with('agency')->withFavoriteOf($request->user())->orderBy('last_name')->orderBy('first_name')->get()
                ->map(fn (Agent $agent): array => AgentController::option($agent))->all(),
            // Partenaires du dossier, annuaire et rôles possibles pour la carte « Partenaires du dossier ».
            'partners' => $lead->partnerLinks->map(fn (LeadPartner $link): array => [
                'id' => $link->id,
                'role' => $link->role->value,
                'role_label' => $link->role->label(),
                'note' => $link->note,
                'partner' => [
                    'id' => $link->partner->id,
                    'uuid' => $link->partner->uuid,
                    'name' => $link->partner->name,
                    'type' => $link->partner->type->value,
                    'type_label' => $link->partner->type->label(),
                    'email' => $link->partner->email,
                    'phone' => $link->partner->phone,
                    'contacts' => $link->partner->contacts->map(fn (PartnerContact $contact): array => ['id' => $contact->id, 'name' => $contact->fullName(), 'email' => $contact->email])->all(),
                ],
            ])->all(),
            'partnerOptions' => Partner::query()->orderBy('name')->get()
                ->map(fn (Partner $partner): array => ['id' => $partner->id, 'name' => $partner->name, 'type' => $partner->type->value, 'type_label' => $partner->type->label()])->all(),
            'partnerRoles' => PartnerRole::options(),
            'duplicates' => $this->findDuplicates($lead->email, $lead->phone, $lead->id),
            // Message reçu à l'arrivée du lead (site, appel ou SMS), mis en avant tant qu'il est à traiter.
            'inbound' => LeadInboundMessageData::fromLead($lead)?->toArray(),
            // Dernier appel ou SMS noté par la téléphonie, quelle que soit la
            // source du lead : le résumé de l'assistant se lit sur la fiche,
            // pas au fond des notes.
            'lastCall' => LeadInboundMessageData::lastPhone($lead)?->toArray(),
            // Qualification proposée par l'assistant IA, en attente de relecture.
            'verdict' => self::verdict($lead),
            'can' => ['delete' => Auth::user()?->can('delete', $lead) ?? false],
            // Fiche de l'annuaire des propriétaires créée depuis ce lead : le
            // menu propose de l'y ajouter, ou d'ouvrir celle qui existe déjà.
            'directoryOwner' => $this->directoryOwner($lead),
            // Ce qu'on peut envoyer au lead depuis la fiche, selon les services configurés.
            'sending' => [
                'email' => $lead->email !== null && $lead->email !== '',
                'paymentLink' => $paymentLinks->isConfigured(),
                // Modalités proposées pour la formule du lead (Confié : totalité ou acompte de 50 %).
                'paymentPlans' => $lead->offer === null ? [] : array_map(
                    fn (PaymentPlan $plan): array => ['value' => $plan->value, 'label' => $plan->label()],
                    $paymentLinks->plansFor($lead->offer),
                ),
                'contractLink' => $yousign->isConfigured() && (bool) config('services.docraptor.key'),
            ],
        ]);
    }

    public function visio(ScheduleLeadVisioRequest $request, Lead $lead, ScheduleLeadVisio $scheduleLeadVisio): RedirectResponse
    {
        $this->authorize('update', $lead);

        $scheduleLeadVisio->handle($lead, $request->visioAt(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Visio programmée, invitation envoyée à :email.', ['email' => (string) $lead->email])]);

        return to_route('leads.show', $lead);
    }

    /** Compte rendu rédigé après l'appel vidéo. */
    public function visioReport(StoreLeadVisioReportRequest $request, Lead $lead, SubmitLeadVisioReport $submit): RedirectResponse
    {
        $this->authorize('update', $lead);

        $submit->handle($lead, (string) $request->validated('report'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Compte rendu de l\'appel vidéo enregistré.')]);

        return back();
    }

    public function send(SendLeadDossierRequest $request, Lead $lead, SendLeadDossier $sendLeadDossier): RedirectResponse
    {
        $this->authorize('update', $lead);

        $sendLeadDossier->handle($lead, $request->items(), $request->user(), $request->plan());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('E-mail envoyé à :email.', ['email' => (string) $lead->email])]);

        return to_route('leads.show', $lead);
    }

    /** E-mail indépendant : « n biens correspondent à votre recherche ». */
    public function propertyMatch(SendLeadPropertyMatchRequest $request, Lead $lead, SendLeadPropertyMatch $sendPropertyMatch): RedirectResponse
    {
        $this->authorize('update', $lead);

        $sendPropertyMatch->handle($lead, $request->count(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('E-mail envoyé à :email.', ['email' => (string) $lead->email])]);

        return to_route('leads.show', $lead);
    }

    public function contact(Lead $lead, TouchLeadContact $touchLeadContact): RedirectResponse
    {
        $this->authorize('update', $lead);

        $touchLeadContact->handle($lead);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dernier contact mis à jour.')]);

        return back();
    }

    public function agent(SetLeadAgentRequest $request, Lead $lead, SetLeadAgent $setLeadAgent): RedirectResponse
    {
        $agentId = $request->validated('agent_id');
        $agent = $agentId === null ? null : Agent::query()->findOrFail((int) $agentId);
        $setLeadAgent->handle($lead, $agent);

        Inertia::flash('toast', ['type' => 'success', 'message' => $agent === null
            ? __('Agent retiré du lead.')
            : __('Agent :name rattaché au lead.', ['name' => $agent->fullName()])]);

        return back();
    }

    /** Demande à l'assistant IA son avis sur le lead (« Lancer une analyse IA » du menu « ⋯ »). */
    public function qualify(Lead $lead, QualifyLead $qualify): RedirectResponse
    {
        $this->authorize('update', $lead);

        try {
            $data = $qualify->handle($lead);
        } catch (\RuntimeException $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $exception->getMessage()]);

            return back();
        }

        Inertia::flash('toast', $data instanceof LeadVerdictData
            ? ['type' => 'success', 'message' => __('Avis de l’assistant : :verdict.', ['verdict' => $data->verdict->label()])]
            : ['type' => 'warning', 'message' => __("Rien à lire pour ce lead : ajoutez son message ou une note, ou configurez l'assistant.")]);

        return back();
    }

    public function assign(AssignLeadRequest $request, Lead $lead, AssignLead $assignLead): RedirectResponse
    {
        $userId = $request->validated('user_id');
        $member = $userId === null ? null : User::query()->findOrFail((int) $userId);
        $assignLead->handle($lead, $member);

        Inertia::flash('toast', ['type' => 'success', 'message' => $member === null
            ? __('Lead :name sans responsable.', ['name' => $lead->fullName()])
            : __('Lead :name suivi par :member.', ['name' => $lead->fullName(), 'member' => $member->name])]);

        return back();
    }

    /** Déplace le lead entre « Tous les leads » et « Leads propriétaires ». */
    public function segment(MoveLeadSegmentRequest $request, Lead $lead, MoveLeadSegment $moveLeadSegment): RedirectResponse
    {
        $segment = LeadSegment::from((string) $request->validated('segment'));
        $moveLeadSegment->handle($lead, $segment, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead déplacé dans « :segment ».', [
            'segment' => $segment === LeadSegment::Owner ? 'Leads propriétaires' : 'Leads locataires',
        ])]);

        return back();
    }

    /** Un ou plusieurs champs du projet, modifiés en place depuis la fiche. */
    public function fields(UpdateLeadFieldsRequest $request, Lead $lead, UpdateLeadFields $updateLeadFields): RedirectResponse
    {
        $updateLeadFields->handle($lead, $request->fields());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name mis à jour.', ['name' => $lead->fullName()])]);

        return back();
    }

    /** Qualité du lead et note de qualification, posées en place depuis la fiche. */
    public function setQualification(QualifyLeadRequest $request, Lead $lead, SetLeadQualification $setLeadQualification): RedirectResponse
    {
        $score = $request->validated('score');
        $setLeadQualification->handle(
            $lead,
            $score === null ? null : (int) $score,
            $request->validated('qualification_note'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Qualification enregistrée.')]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(Lead $lead): array
    {
        $lead->load(['author', 'assignee', 'agent.agency', 'partnerLinks.partner.contacts', 'notes.author', 'statusChanges.author', 'invoices', 'quotes', 'documentRequests', 'property']);

        return [
            // Bien proposé à la location (lead propriétaire), avec ses libellés.
            'property' => OwnerLeadController::propertyDetail($lead->property),
            'lead' => [
                ...self::summary($lead),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'source' => $lead->source->value,
                'updated_at' => $lead->updated_at?->toIso8601String(),
                'agent' => $lead->agent === null ? null : [
                    'id' => $lead->agent->id,
                    'uuid' => $lead->agent->uuid,
                    'name' => $lead->agent->fullName(),
                    'agency' => $lead->agent->agency?->name,
                    'position' => $lead->agent->position,
                    'phone' => $lead->agent->phone,
                    'email' => $lead->agent->email,
                ],
            ],
            'invoices' => $lead->invoices->map(fn (Invoice $invoice): array => [
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
            'quotes' => $lead->quotes->map(fn (Quote $quote): array => [
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
            'documentRequests' => $lead->documentRequests->map(fn (DocumentRequest $request): array => [
                'id' => $request->id,
                'uuid' => $request->uuid,
                'name' => $request->fullName(),
                'person_count' => count($request->persons),
                'document_count' => $request->documentCount(),
                'created_at' => $request->created_at?->toIso8601String(),
            ])->all(),
            'notes' => $lead->notes->map(fn (LeadNote $note): array => self::note($note))->all(),
            'history' => $lead->statusChanges->map(fn (LeadStatusChange $change): array => [
                'id' => $change->id,
                'from' => $change->from_status?->label(),
                'to' => $change->to_status->label(),
                'to_status' => $change->to_status->value,
                'by' => $change->author?->name,
                'at' => $change->created_at->toIso8601String(),
            ])->all(),
        ];
    }

    public function edit(Lead $lead): Response
    {
        $this->authorize('update', $lead);

        return Inertia::render('leads/create', [
            ...$this->formProps(),
            'lead' => [
                'id' => $lead->id,
                'uuid' => $lead->uuid,
                'name' => $lead->fullName(),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email ?? '',
                'phone' => $lead->phone ?? '',
                'company' => $lead->company ?? '',
                'language' => $lead->language->value,
                'offer' => $lead->offer === null ? '' : $lead->offer->value,
                'source' => $lead->source->value,
                'source_note' => $lead->source_note ?? '',
                'arrival_at' => $lead->arrival_at?->toDateString() ?? '',
                'budget' => $lead->budget_cents === null ? '' : (string) ($lead->budget_cents / 100),
                'currency' => $lead->currency->value,
                'origin_city' => $lead->origin_city ?? '',
                'origin_country' => $lead->origin_country ?? '',
                'employment_status' => $lead->employment_status === null ? '' : $lead->employment_status->value,
                'districts' => $lead->districts ?? [],
                'property_types' => $lead->property_types?->map(fn (PropertyType $type): string => $type->value)->all() ?? [],
                'duration' => $lead->duration === null ? '' : $lead->duration->value,
                'guarantors' => $lead->guarantors?->map(fn (GuarantorType $type): string => $type->value)->all() ?? [],
                'furnished' => $lead->furnished === null ? '' : $lead->furnished->value,
                'message' => $lead->message ?? '',
                'project_notes' => $lead->project_notes ?? '',
                'score' => $lead->score,
                'recontact_channel' => $lead->recontact_channel === null ? '' : $lead->recontact_channel->value,
                'recontact_at' => $lead->recontact_at?->format('Y-m-d') ?? '',
                'recontact_time' => $lead->recontact_at?->format('H:i') ?? '10:00',
                'qualification_note' => $lead->qualification_note ?? '',
                'assigned_to' => $lead->assigned_to,
                'segment' => LeadSegment::fromLead($lead)->value,
            ],
        ]);
    }

    /**
     * Fiche d'annuaire créée depuis ce lead propriétaire, s'il y en a une.
     *
     * @return array{uuid: string, name: string}|null
     */
    private function directoryOwner(Lead $lead): ?array
    {
        $owner = $lead->owner()->first();

        return $owner === null ? null : ['uuid' => $owner->uuid, 'name' => $owner->fullName()];
    }

    public function update(UpdateLeadRequest $request, Lead $lead, UpdateLead $updateLead): RedirectResponse
    {
        $lead = $updateLead->handle($lead, LeadData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name mis à jour.', ['name' => $lead->fullName()])]);

        return to_route('leads.show', $lead);
    }

    public function updateStatus(UpdateLeadStatusRequest $request, Lead $lead, UpdateLeadStatus $updateLeadStatus): RedirectResponse
    {
        $position = $request->validated('position');
        $reason = $request->validated('loss_reason');
        $updateLeadStatus->handle(
            $lead,
            LeadStatus::from($request->validated('status')),
            $position === null ? null : (int) $position,
            $request->user(),
            $reason === null ? null : LeadLossReason::from((string) $reason),
            $request->validated('loss_note'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name passé en « :status ».', [
            'name' => $lead->fullName(),
            'status' => $lead->status->label(),
        ])]);

        return back();
    }

    /** Transforme le lead en client : il quitte le kanban pour les dossiers. */
    public function convert(Lead $lead, ConvertLeadToClient $convertLeadToClient): RedirectResponse
    {
        $this->authorize('update', $lead);

        $convertLeadToClient->handle($lead, auth()->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name est maintenant client : son dossier est ouvert.', ['name' => $lead->fullName()])]);

        return to_route('clients.index');
    }

    public function storeNote(StoreLeadNoteRequest $request, Lead $lead, AddLeadNote $addLeadNote): RedirectResponse
    {
        $addLeadNote->handle($lead, $request->validated('body'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Note ajoutée.')]);

        return back();
    }

    public function updateNote(UpdateLeadNoteRequest $request, Lead $lead, LeadNote $note, UpdateLeadNote $updateLeadNote): RedirectResponse
    {
        $updateLeadNote->handle($note, $request->validated('body'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Note modifiée.')]);

        return back();
    }

    public function destroyNote(Lead $lead, LeadNote $note, DeleteLeadNote $deleteLeadNote): RedirectResponse
    {
        $this->authorize('delete', $note);

        $deleteLeadNote->handle($note);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Note supprimée.')]);

        return back();
    }

    public function recontact(ScheduleLeadRecontactRequest $request, Lead $lead, ScheduleLeadRecontact $scheduleLeadRecontact): RedirectResponse
    {
        $at = $request->validated('recontact_at');
        $channel = $request->validated('recontact_channel');
        $scheduleLeadRecontact->handle(
            $lead,
            $at === null ? null : Date::parse((string) $at),
            $channel === null ? null : RecontactChannel::from((string) $channel),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => $at === null ? __('Recontact effacé.') : __('Recontact planifié.')]);

        return back();
    }

    public function destroy(Lead $lead, DeleteLead $deleteLead): RedirectResponse
    {
        $this->authorize('delete', $lead);

        $name = $lead->fullName();
        $deleteLead->handle($lead);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name supprimé.', ['name' => $name])]);

        return to_route('leads.index');
    }

    /**
     * L'avis de l'assistant (« AI check ») : qualifié ou non, motif, date.
     *
     * @return array{value: string, label: string, reason: string|null, at: string|null}|null
     */
    public static function verdict(Lead $lead): ?array
    {
        if ($lead->ai_verdict === null) {
            return null;
        }

        return [
            'value' => $lead->ai_verdict->value,
            'label' => $lead->ai_verdict->label(),
            'reason' => $lead->ai_verdict_reason,
            'at' => $lead->ai_verdict_at?->toIso8601String(),
        ];
    }

    /**
     * Résumé d'un lead pour les listes ; `$ownerLabels` prend les libellés propriétaires (« En signature »).
     *
     * @return array<string, mixed>
     */
    public static function summary(Lead $lead, bool $ownerLabels = false): array
    {
        return [
            'id' => $lead->id,
            'uuid' => $lead->uuid,
            'reference' => $lead->reference,
            'name' => $lead->fullName(),
            'email' => $lead->email,
            'phone' => $lead->phone,
            'offer' => $lead->offer?->value,
            'offer_label' => $lead->offer?->label(),
            'arrival_at' => $lead->arrival_at?->toDateString(),
            'budget_cents' => $lead->budget_cents,
            'currency' => $lead->currency->value,
            'origin_city' => $lead->origin_city,
            'origin_country' => $lead->origin_country,
            'employment_status' => $lead->employment_status?->value,
            'employment_status_label' => $lead->employment_status?->label(),
            'project_notes' => $lead->project_notes,
            'source_label' => $lead->source->label(),
            'source_note' => $lead->source_note,
            'company' => $lead->company,
            'language' => $lead->language->value,
            'language_label' => $lead->language->label(),
            'districts' => $lead->districts ?? [],
            'property_types' => $lead->property_types?->map(fn (PropertyType $type): array => ['value' => $type->value, 'label' => $type->label()])->all() ?? [],
            'duration' => $lead->duration?->value,
            'duration_label' => $lead->duration?->label(),
            'guarantor_label' => $lead->guarantors === null || $lead->guarantors->isEmpty()
                ? null
                : $lead->guarantors->map(fn (GuarantorType $type): string => $type->label())->implode(', '),
            'furnished' => $lead->furnished?->value,
            'furnished_label' => $lead->furnished?->label(),
            'guarantors' => $lead->guarantors?->map(fn (GuarantorType $type): string => $type->value)->all() ?? [],
            'message' => $lead->message,
            'score' => $lead->score,
            'recontact_channel' => $lead->recontact_channel?->value,
            'recontact_channel_label' => $lead->recontact_channel?->label(),
            'recontact_at' => $lead->recontact_at?->toIso8601String(),
            'qualification_note' => $lead->qualification_note,
            'status' => $lead->status->value,
            'segment' => LeadSegment::fromLead($lead)->value,
            // L'avis de l'assistant, lisible partout où le lead apparaît.
            'ai_verdict' => $lead->ai_verdict?->value,
            'ai_verdict_label' => $lead->ai_verdict?->label(),
            'status_label' => $ownerLabels ? $lead->status->ownerLabel() : $lead->status->label(),
            'loss_reason' => $lead->loss_reason?->value,
            'loss_reason_label' => $lead->loss_reason?->label(),
            'loss_note' => $lead->loss_note,
            'position' => $lead->position,
            'last_contacted_at' => $lead->last_contacted_at?->toIso8601String(),
            'visio_at' => $lead->visio_at?->toIso8601String(),
            'visio_meet_link' => $lead->visio_meet_link,
            // Compte rendu de l'appel vidéo ; `visio_report_due` = visio passée sans compte rendu depuis ce créneau.
            'visio_report' => $lead->visio_report,
            'visio_report_submitted_at' => $lead->visio_report_submitted_at?->toIso8601String(),
            'visio_report_due' => $lead->visioReportDue(),
            'created_at' => $lead->created_at?->toIso8601String(),
            'author' => $lead->author === null ? null : ['id' => $lead->author->id, 'name' => $lead->author->name, 'avatar' => $lead->author->avatar],
            'assignee' => $lead->assignee === null ? null : ['id' => $lead->assignee->id, 'name' => $lead->assignee->name, 'avatar' => $lead->assignee->avatar],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formProps(): array
    {
        return [
            'offers' => self::offers(),
            'sources' => array_map(
                fn (LeadSource $source): array => ['value' => $source->value, 'label' => $source->label()],
                LeadSource::cases(),
            ),
            'currencies' => array_map(
                fn (Currency $currency): array => ['value' => $currency->value, 'label' => $currency->label()],
                Currency::cases(),
            ),
            'defaultCurrency' => config('company.default_currency'),
            'languages' => LeadLanguage::options(),
            'propertyTypes' => PropertyType::options(),
            'durations' => LeadDuration::options(),
            'guarantors' => GuarantorType::options(),
            'furnishedOptions' => Furnished::options(),
            'employmentStatuses' => EmploymentStatus::options(),
            'recontactChannels' => RecontactChannel::options(),
            'lossReasons' => LeadLossReason::options(),
        ];
    }

    /**
     * @return list<array{value: string, label: string, description: string, summary: string, price_cents: int}>
     */
    public static function offers(): array
    {
        return array_map(
            fn (Offer $offer): array => [
                'value' => $offer->value,
                'label' => $offer->label(),
                'description' => $offer->description(),
                'summary' => $offer->summary(),
                'price_cents' => $offer->defaultPriceCents(Currency::EUR),
            ],
            Offer::cases(),
        );
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function statuses(): array
    {
        return array_map(
            fn (LeadStatus $status): array => ['value' => $status->value, 'label' => $status->label()],
            LeadStatus::cases(),
        );
    }
}
