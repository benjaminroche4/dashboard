<?php

declare(strict_types=1);

namespace App\Http\Controllers\Leads;

use App\Actions\Leads\AddLeadNote;
use App\Actions\Leads\CreateLead;
use App\Actions\Leads\UpdateLead;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\StoreLeadNoteRequest;
use App\Http\Requests\Leads\StoreLeadRequest;
use App\Http\Requests\Leads\UpdateLeadRequest;
use App\Http\Requests\Leads\UpdateLeadStatusRequest;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\LeadStatusChange;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Lead::class);

        $leads = Lead::query()
            ->with('author')
            ->orderBy('position')
            ->latest()
            ->get()
            ->map(fn (Lead $lead): array => $this->summary($lead))
            ->all();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'statuses' => $this->statuses(),
            'offers' => $this->offers(),
        ]);
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
                    ->orWhere('phone', 'like', "%{$query}%");
            })
            ->orderBy('position')
            ->limit(10)
            ->get()
            ->map(fn (Lead $lead): array => [
                'id' => $lead->id,
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

    public function show(Lead $lead): Response
    {
        $this->authorize('view', $lead);

        $lead->load(['author', 'notes.author', 'statusChanges.author']);

        return Inertia::render('leads/show', [
            'lead' => [
                ...$this->summary($lead),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'source' => $lead->source->value,
                'updated_at' => $lead->updated_at?->toIso8601String(),
            ],
            'notes' => $lead->notes->map(fn (LeadNote $note): array => [
                'id' => $note->id,
                'body' => $note->body,
                'by' => $note->author?->name,
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
            'statuses' => $this->statuses(),
        ]);
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
                'offer' => $lead->offer === null ? '' : $lead->offer->value,
                'arrival_at' => $lead->arrival_at?->toDateString() ?? '',
                'budget' => $lead->budget_cents === null ? '' : (string) ($lead->budget_cents / 100),
                'currency' => $lead->currency->value,
                'origin_city' => $lead->origin_city ?? '',
                'source' => $lead->source->value,
                'message' => $lead->message ?? '',
                'score' => $lead->score,
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
        $lead = $updateLeadStatus->handle(
            $lead,
            LeadStatus::from($request->validated('status')),
            $position === null ? null : (int) $position,
            $request->user(),
        );

        return back();
    }

    public function storeNote(StoreLeadNoteRequest $request, Lead $lead, AddLeadNote $addLeadNote): RedirectResponse
    {
        $addLeadNote->handle($lead, $request->validated('body'), $request->user());

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Lead $lead): array
    {
        return [
            'id' => $lead->id,
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
            'message' => $lead->message,
            'score' => $lead->score,
            'status' => $lead->status->value,
            'status_label' => $lead->status->label(),
            'position' => $lead->position,
            'last_contacted_at' => $lead->last_contacted_at?->toIso8601String(),
            'created_at' => $lead->created_at?->toIso8601String(),
            'created_by' => $lead->author?->name,
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
        ];
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    private function offers(): array
    {
        return array_map(
            fn (Offer $offer): array => ['value' => $offer->value, 'label' => $offer->label(), 'description' => $offer->description()],
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
