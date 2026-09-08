<?php

declare(strict_types=1);

namespace App\Http\Requests\Activity;

use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Filtres du journal d'activité : membre, ressource, lead (UUID) et page.
 */
class ShowActivityLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'member' => ['nullable', 'integer', 'exists:users,id'],
            'resource' => ['nullable', 'string', 'max:50'],
            'lead' => ['nullable', 'string', 'uuid'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
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
