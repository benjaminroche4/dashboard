<?php

declare(strict_types=1);

namespace App\Actions\Dashboard;

use App\Actions\Clients\SendPropertyDecisionReminders;
use App\Enums\DocumentUploadStatus;
use App\Enums\LeadStatus;
use App\Enums\SiteSection;
use App\Enums\VisitStatus;
use App\Http\Controllers\Clients\VisitController;
use App\Http\Controllers\Leads\LeadController;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\LeadPropertyLink;
use App\Models\Property;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Builder;

/**
 * « Aujourd'hui » : ce qu'un membre a à faire maintenant, réuni sur la page
 * d'arrivée — sa tournée du jour, les comptes rendus qu'il doit, les leads
 * qui attendent un premier contact, ses recontacts du jour, les biens que
 * ses clients doivent trancher, les pièces relues par l'assistant qui
 * attendent sa décision. Chaque bloc n'est rempli que si sa section lui est
 * ouverte en lecture ; null = bloc masqué.
 */
final class BuildToday
{
    /** Lignes par bloc ; le total réel est renvoyé à côté. */
    public const int LIMIT = 8;

    /**
     * @return array<string, mixed>
     */
    public function handle(User $user): array
    {
        return [
            'visits' => $user->canRead(SiteSection::Visits) ? $this->visits($user) : null,
            'reports_due' => $user->canRead(SiteSection::Visits) ? $this->reportsDue($user) : null,
            'first_contacts' => $user->canRead(SiteSection::Leads) ? $this->firstContacts($user) : null,
            'recontacts' => $user->canRead(SiteSection::Leads) ? $this->recontacts($user) : null,
            'decisions' => $user->canRead(SiteSection::Clients) ? $this->decisions($user) : null,
            'documents_to_review' => $user->canRead(SiteSection::Documents) ? $this->documentsToReview($user) : null,
        ];
    }

    /**
     * Ma tournée : les visites du jour que je réalise, dans l'ordre.
     *
     * @return list<array<string, mixed>>
     */
    private function visits(User $user): array
    {
        return array_values(Visit::query()
            ->with(self::VISIT_RELATIONS)
            ->where('assigned_to', $user->id)
            ->where('status', '!=', VisitStatus::Cancelled)
            ->whereBetween('scheduled_at', [today(), now()->endOfDay()])
            ->oldest('scheduled_at')
            ->get()
            ->map(fn (Visit $visit): array => VisitController::summary($visit))
            ->all());
    }

    /**
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    private function reportsDue(User $user): array
    {
        $query = Visit::query()->awaitingReport()->where('assigned_to', $user->id);

        return [
            'items' => array_values((clone $query)->with(self::VISIT_RELATIONS)->latest('scheduled_at')->limit(self::LIMIT)->get()
                ->map(fn (Visit $visit): array => VisitController::summary($visit))->all()),
            'total' => $query->count(),
        ];
    }

    /**
     * Leads « À traiter » jamais contactés, les miens ou sans responsable : le
     * chrono des 30 minutes court pour eux.
     *
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    private function firstContacts(User $user): array
    {
        $query = Lead::query()
            // `LeadController::summary()` lit l'auteur et le responsable : chargés d'avance.
            ->with(['author', 'assignee'])
            ->where('status', LeadStatus::Todo)
            ->whereNull('last_contacted_at')
            ->where(fn (Builder $q): Builder => $q->where('assigned_to', $user->id)->orWhereNull('assigned_to'));

        return $this->leadBlock($query, 'created_at');
    }

    /**
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    private function recontacts(User $user): array
    {
        $query = Lead::query()
            // `LeadController::summary()` lit l'auteur et le responsable : chargés d'avance.
            ->with(['author', 'assignee'])
            ->where('assigned_to', $user->id)
            ->whereNotIn('status', [LeadStatus::Archived, LeadStatus::Converted])
            ->whereNotNull('recontact_at')
            ->whereDate('recontact_at', '<=', today());

        return $this->leadBlock($query, 'recontact_at');
    }

    /**
     * @param  Builder<Lead>  $query
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    private function leadBlock(Builder $query, string $order): array
    {
        return [
            'items' => array_values((clone $query)->oldest($order)->limit(self::LIMIT)->get()
                ->map(fn (Lead $lead): array => LeadController::summary($lead))->all()),
            'total' => $query->count(),
        ];
    }

    /**
     * Biens visités par mes clients, restés « à décider » : la même règle que
     * la relance, sans délai — ce qui attend une décision se voit tout de suite.
     *
     * @return array{items: list<array{lead: array{uuid: string, name: string}, property: array{uuid: string, label: string}, due: bool}>, total: int}
     */
    private function decisions(User $user): array
    {
        $leadIds = Lead::query()->where('assigned_to', $user->id)->where('status', LeadStatus::Converted)->pluck('id');
        $links = LeadPropertyLink::query()->awaitingDecision(0)->whereIn('lead_id', $leadIds)->orderBy('status_at')->get();
        $leads = Lead::query()->whereIn('id', $links->pluck('lead_id'))->get()->keyBy('id');
        $properties = Property::query()->whereIn('id', $links->pluck('property_id'))->get()->keyBy('id');
        $dueSince = now()->subHours(SendPropertyDecisionReminders::hours());

        return [
            'items' => array_values($links->take(self::LIMIT)->map(function (LeadPropertyLink $link) use ($leads, $properties, $dueSince): ?array {
                $lead = $leads->get($link->lead_id);
                $property = $properties->get($link->property_id);

                if (! $lead instanceof Lead || ! $property instanceof Property) {
                    return null;
                }

                return [
                    'lead' => ['uuid' => $lead->uuid, 'name' => $lead->householdName()],
                    'property' => ['uuid' => $property->uuid, 'label' => $property->label()],
                    // Le délai de relance est passé : la décision traîne.
                    'due' => $link->status_at !== null && $link->status_at->lte($dueSince),
                ];
            })->filter()->all()),
            'total' => $links->count(),
        ];
    }

    /**
     * Pièces que l'assistant a relues et qui attendent ma décision, par liste.
     *
     * @return array{items: list<array{uuid: string, name: string, count: int}>, total: int}
     */
    private function documentsToReview(User $user): array
    {
        $requests = DocumentRequest::query()
            ->whereHas('lead', fn (Builder $q): Builder => $q->where('assigned_to', $user->id))
            ->whereHas('uploads', fn (Builder $q): Builder => $q->where('status', DocumentUploadStatus::Pending)->whereNotNull('ai_review'))
            ->withCount(['uploads as to_review_count' => fn (Builder $q): Builder => $q->where('status', DocumentUploadStatus::Pending)->whereNotNull('ai_review')])
            ->latest('updated_at')
            ->get();

        return [
            'items' => array_values($requests->take(self::LIMIT)->map(fn (DocumentRequest $request): array => [
                'uuid' => $request->uuid,
                'name' => $request->fullName(),
                'count' => (int) $request->getAttribute('to_review_count'),
            ])->all()),
            'total' => (int) $requests->sum(fn (DocumentRequest $request): int => (int) $request->getAttribute('to_review_count')),
        ];
    }

    /** Ce que `VisitController::summary()` lit sans requête par ligne. */
    private const array VISIT_RELATIONS = ['lead.properties', 'property', 'agent.agency', 'assignee', 'creator', 'reportAuthor'];
}
