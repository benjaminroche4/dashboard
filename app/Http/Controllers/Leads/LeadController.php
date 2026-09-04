<?php

declare(strict_types=1);

namespace App\Http\Controllers\Leads;

use App\Actions\Leads\CreateLead;
use App\Actions\Leads\UpdateLeadStatus;
use App\Data\LeadData;
use App\Enums\Currency;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\StoreLeadRequest;
use App\Http\Requests\Leads\UpdateLeadStatusRequest;
use App\Models\Lead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
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
            ->latest()
            ->get()
            ->map(fn (Lead $lead): array => [
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
                'status' => $lead->status->value,
                'status_label' => $lead->status->label(),
                'last_contacted_at' => $lead->last_contacted_at?->toIso8601String(),
                'created_at' => $lead->created_at?->toIso8601String(),
                'created_by' => $lead->author?->name,
            ])
            ->all();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'statuses' => $this->statuses(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Lead::class);

        return Inertia::render('leads/create', [
            'offers' => collect(Offer::cases())
                ->map(fn (Offer $offer): array => [
                    'value' => $offer->value,
                    'label' => $offer->label(),
                    'description' => $offer->description(),
                ])
                ->all(),
            'sources' => collect(LeadSource::cases())
                ->map(fn (LeadSource $source): array => ['value' => $source->value, 'label' => $source->label()])
                ->all(),
            'currencies' => collect(Currency::cases())
                ->map(fn (Currency $currency): array => ['value' => $currency->value, 'label' => $currency->label()])
                ->all(),
            'defaultCurrency' => config('company.default_currency'),
        ]);
    }

    public function store(StoreLeadRequest $request, CreateLead $createLead): RedirectResponse
    {
        $lead = $createLead->handle(LeadData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name ajouté.', ['name' => $lead->fullName()])]);

        return to_route('leads.index');
    }

    public function updateStatus(UpdateLeadStatusRequest $request, Lead $lead, UpdateLeadStatus $updateLeadStatus): RedirectResponse
    {
        $lead = $updateLeadStatus->handle($lead, LeadStatus::from($request->validated('status')));

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name est maintenant « :status ».', ['name' => $lead->fullName(), 'status' => $lead->status->label()])]);

        return back();
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
