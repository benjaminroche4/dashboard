<?php

declare(strict_types=1);

namespace App\Http\Controllers\Leads;

use App\Actions\Leads\AddLeadNote;
use App\Actions\Leads\AssignLead;
use App\Actions\Leads\CreateLead;
use App\Actions\Leads\DeleteLead;
use App\Actions\Leads\DeleteLeadNote;
use App\Actions\Leads\ScheduleLeadRecontact;
use App\Actions\Leads\ScheduleLeadVisio;
use App\Actions\Leads\SendLeadDossier;
use App\Actions\Leads\TouchLeadContact;
use App\Actions\Leads\UpdateLead;
use App\Actions\Leads\UpdateLeadNote;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadLossReason;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Enums\PaymentPlan;
use App\Enums\PropertyType;
use App\Enums\RecontactChannel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\AssignLeadRequest;
use App\Http\Requests\Leads\ScheduleLeadRecontactRequest;
use App\Http\Requests\Leads\ScheduleLeadVisioRequest;
use App\Http\Requests\Leads\SendLeadDossierRequest;
use App\Http\Requests\Leads\StoreLeadNoteRequest;
use App\Http\Requests\Leads\StoreLeadRequest;
use App\Http\Requests\Leads\UpdateLeadNoteRequest;
use App\Http\Requests\Leads\UpdateLeadRequest;
use App\Http\Requests\Leads\UpdateLeadStatusRequest;
use App\Models\DocumentRequest;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\LeadStatusChange;
use App\Models\User;
use App\Services\PaymentLinks;
use App\Services\Yousign;
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

    public function index(): Response
    {
        $this->authorize('viewAny', Lead::class);

        $leads = Lead::query()
            ->with(['author', 'assignee'])
            ->orderBy('position')
            ->latest()
            ->get()
            ->map(fn (Lead $lead): array => $this->summary($lead))
            ->all();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'statuses' => $this->statuses(),
            'offers' => $this->offers(),
            'lossReasons' => LeadLossReason::options(),
            // Temps réel : ne recharger que la liste, pas toute la page.
            'realtimeOnly' => ['leads'],
        ]);
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
                $builder->whereRaw("first_name || ' ' || last_name like ?", ["%{$query}%"])
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
                'reference' => $lead->reference,
                'company' => $lead->company,
                'name' => $lead->fullName(),
                'email' => $lead->email,
                'status_label' => $lead->status->label(),
                'url' => route('leads.show', $lead),
            ])
            ->all();

        return response()->json($leads);
    }

    public function create(): Response
    {
        $this->authorize('create', Lead::class);

        return Inertia::render('leads/create', $this->formProps());
    }

    public function store(StoreLeadRequest $request, CreateLead $createLead): RedirectResponse
    {
        $lead = $createLead->handle(LeadData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name ajouté.', ['name' => $lead->fullName()])]);

        return to_route('leads.index');
    }

    public function show(Lead $lead, PaymentLinks $paymentLinks, Yousign $yousign): Response
    {
        $this->authorize('view', $lead);

        return Inertia::render('leads/show', [
            ...$this->detail($lead),
            'statuses' => $this->statuses(),
            'recontactChannels' => RecontactChannel::options(),
            'lossReasons' => LeadLossReason::options(),
            'duplicates' => $this->findDuplicates($lead->email, $lead->phone, $lead->id),
            'can' => ['delete' => Auth::user()?->can('delete', $lead) ?? false],
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

    public function send(SendLeadDossierRequest $request, Lead $lead, SendLeadDossier $sendLeadDossier): RedirectResponse
    {
        $this->authorize('update', $lead);

        $sendLeadDossier->handle($lead, $request->items(), $request->user(), $request->plan());

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

    public function assign(AssignLeadRequest $request, Lead $lead, AssignLead $assignLead): RedirectResponse
    {
        $userId = $request->validated('user_id');
        $assignLead->handle($lead, $userId === null ? null : User::query()->findOrFail((int) $userId));

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(Lead $lead): array
    {
        $lead->load(['author', 'assignee', 'notes.author', 'statusChanges.author', 'invoices', 'documentRequests']);

        return [
            'lead' => [
                ...$this->summary($lead),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'source' => $lead->source->value,
                'updated_at' => $lead->updated_at?->toIso8601String(),
            ],
            'invoices' => $lead->invoices->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'amount_cents' => $invoice->amount_cents,
                'currency' => $invoice->currency->value,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at->toDateString(),
            ])->all(),
            'documentRequests' => $lead->documentRequests->map(fn (DocumentRequest $request): array => [
                'id' => $request->id,
                'name' => $request->fullName(),
                'person_count' => count($request->persons),
                'document_count' => $request->documentCount(),
                'created_at' => $request->created_at?->toIso8601String(),
            ])->all(),
            'notes' => $lead->notes->map(fn (LeadNote $note): array => [
                'id' => $note->id,
                'body' => $note->body,
                'by' => $note->author?->name,
                'avatar' => $note->author?->avatar,
                'mine' => $note->user_id === Auth::id(),
                'can_edit' => Auth::user()?->can('update', $note) ?? false,
                'can_delete' => Auth::user()?->can('delete', $note) ?? false,
                'at' => $note->created_at?->toIso8601String(),
            ])->all(),
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
                'districts' => $lead->districts ?? [],
                'property_types' => $lead->property_types?->map(fn (PropertyType $type): string => $type->value)->all() ?? [],
                'duration' => $lead->duration === null ? '' : $lead->duration->value,
                'guarantors' => $lead->guarantors?->map(fn (GuarantorType $type): string => $type->value)->all() ?? [],
                'furnished' => $lead->furnished === null ? '' : $lead->furnished->value,
                'message' => $lead->message ?? '',
                'score' => $lead->score,
                'recontact_channel' => $lead->recontact_channel === null ? '' : $lead->recontact_channel->value,
                'recontact_at' => $lead->recontact_at?->toDateString() ?? '',
                'qualification_note' => $lead->qualification_note ?? '',
                'assigned_to' => $lead->assigned_to,
            ],
        ]);
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

        return back();
    }

    public function storeNote(StoreLeadNoteRequest $request, Lead $lead, AddLeadNote $addLeadNote): RedirectResponse
    {
        $addLeadNote->handle($lead, $request->validated('body'), $request->user());

        return back();
    }

    public function updateNote(UpdateLeadNoteRequest $request, Lead $lead, LeadNote $note, UpdateLeadNote $updateLeadNote): RedirectResponse
    {
        $updateLeadNote->handle($note, $request->validated('body'));

        return back();
    }

    public function destroyNote(Lead $lead, LeadNote $note, DeleteLeadNote $deleteLeadNote): RedirectResponse
    {
        $this->authorize('delete', $note);

        $deleteLeadNote->handle($note);

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
     * @return array<string, mixed>
     */
    private function summary(Lead $lead): array
    {
        return [
            'id' => $lead->id,
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
            'source_label' => $lead->source->label(),
            'source_note' => $lead->source_note,
            'company' => $lead->company,
            'language' => $lead->language->value,
            'language_label' => $lead->language->label(),
            'districts' => $lead->districts ?? [],
            'property_types' => $lead->property_types?->map(fn (PropertyType $type): array => ['value' => $type->value, 'label' => $type->label()])->all() ?? [],
            'duration_label' => $lead->duration?->label(),
            'guarantor_label' => $lead->guarantors === null || $lead->guarantors->isEmpty()
                ? null
                : $lead->guarantors->map(fn (GuarantorType $type): string => $type->label())->implode(', '),
            'furnished_label' => $lead->furnished?->label(),
            'message' => $lead->message,
            'score' => $lead->score,
            'recontact_channel' => $lead->recontact_channel?->value,
            'recontact_channel_label' => $lead->recontact_channel?->label(),
            'recontact_at' => $lead->recontact_at?->toDateString(),
            'qualification_note' => $lead->qualification_note,
            'status' => $lead->status->value,
            'status_label' => $lead->status->label(),
            'loss_reason' => $lead->loss_reason?->value,
            'loss_reason_label' => $lead->loss_reason?->label(),
            'loss_note' => $lead->loss_note,
            'position' => $lead->position,
            'last_contacted_at' => $lead->last_contacted_at?->toIso8601String(),
            'visio_at' => $lead->visio_at?->toIso8601String(),
            'visio_meet_link' => $lead->visio_meet_link,
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
            'offers' => $this->offers(),
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
            'recontactChannels' => RecontactChannel::options(),
            'lossReasons' => LeadLossReason::options(),
        ];
    }

    /**
     * @return list<array{value: string, label: string, description: string, summary: string, price_cents: int}>
     */
    private function offers(): array
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
    private function statuses(): array
    {
        return array_map(
            fn (LeadStatus $status): array => ['value' => $status->value, 'label' => $status->label()],
            LeadStatus::cases(),
        );
    }
}
