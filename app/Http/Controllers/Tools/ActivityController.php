<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\Activity\ShowActivityLogRequest;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\User;
use App\Support\ActivityResource;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Journal d'activité : toutes les actions du backoffice, 50 par page,
 * filtrables par membre, ressource et lead.
 */
class ActivityController extends Controller
{
    public const int PER_PAGE = 50;

    public function index(ShowActivityLogRequest $request): Response
    {
        $lead = $request->lead();

        $activities = Activity::query()
            ->with(['actor', 'lead'])
            ->when($request->memberId(), fn ($query, int $memberId) => $query->where('user_id', $memberId))
            ->when($request->resource(), fn ($query, string $resource) => $query->where('resource', $resource))
            ->when($lead, fn ($query) => $query->where('lead_id', $lead->id))
            ->latest('created_at')
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Activity $activity): array => self::summary($activity));

        $resources = Activity::query()->select('resource')->distinct()->orderBy('resource')->pluck('resource')
            ->map(fn (string $slug): array => ['value' => $slug, 'label' => ActivityResource::label($slug)])
            ->values()
            ->all();

        return Inertia::render('tools/activity', [
            'activities' => [
                'data' => $activities->items(),
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'total' => $activities->total(),
                'prev_page_url' => $activities->previousPageUrl(),
                'next_page_url' => $activities->nextPageUrl(),
            ],
            'members' => User::query()->orderBy('name')->get()
                ->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar])
                ->all(),
            'resources' => $resources,
            'filters' => [
                'member' => $request->memberId(),
                'resource' => $request->resource(),
                'lead' => $lead?->uuid,
            ],
            'lead' => $lead instanceof Lead ? ['id' => $lead->id, 'uuid' => $lead->uuid, 'name' => $lead->fullName()] : null,
        ]);
    }

    /**
     * Forme d'une entrée du journal, partagée avec le dossier client.
     *
     * @return array<string, mixed>
     */
    public static function summary(Activity $activity): array
    {
        return [
            'id' => $activity->id,
            'message' => $activity->message,
            'actor' => $activity->actor === null ? null : [
                'id' => $activity->actor->id,
                'name' => $activity->actor->name,
                'avatar' => $activity->actor->avatar,
            ],
            'resource' => $activity->resource,
            'resource_label' => ActivityResource::label($activity->resource),
            'lead' => $activity->lead === null ? null : [
                'id' => $activity->lead->id,
                'uuid' => $activity->lead->uuid,
                'name' => $activity->lead->fullName(),
            ],
            'created_at' => $activity->created_at->toIso8601String(),
        ];
    }
}
