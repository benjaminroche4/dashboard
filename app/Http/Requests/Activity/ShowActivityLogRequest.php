<?php

declare(strict_types=1);

namespace App\Http\Requests\Activity;

use App\Enums\ActivityPeriod;
use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filtres du journal d'activité : période, membre, ressource, lead (UUID) et page.
 */
class ShowActivityLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'period' => ['nullable', Rule::enum(ActivityPeriod::class)],
            'member' => ['nullable', 'integer', 'exists:users,id'],
            'resource' => ['nullable', 'string', 'max:50'],
            'lead' => ['nullable', 'string', 'uuid'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Fenêtre de temps demandée ; les 30 derniers jours par défaut, mais tout
     * l'historique quand le journal est déjà restreint à un seul dossier.
     */
    public function period(): ActivityPeriod
    {
        $period = $this->validated('period');

        if (is_string($period)) {
            return ActivityPeriod::from($period);
        }

        return $this->validated('lead') === null
            ? ActivityPeriod::default()
            : ActivityPeriod::All;
    }

    public function memberId(): ?int
    {
        $member = $this->validated('member');

        return $member === null ? null : (int) $member;
    }

    public function resource(): ?string
    {
        $resource = $this->validated('resource');

        return is_string($resource) && $resource !== '' ? $resource : null;
    }

    /** Lead filtré, retrouvé par son UUID public ; null si absent ou inconnu. */
    public function lead(): ?Lead
    {
        $uuid = $this->validated('lead');

        return is_string($uuid) ? Lead::query()->where('uuid', $uuid)->first() : null;
    }
}
