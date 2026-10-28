<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\LeadLossReason;
use App\Enums\LeadStatus;
use App\Models\Lead;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Changement de statut de plusieurs leads cochés dans le tableau : un seul
 * statut, et à l'archivage un seul motif de perte pour tout le groupe.
 */
class BulkUpdateLeadStatusRequest extends FormRequest
{
    public const int MAX_LEADS = 200;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_LEADS],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:leads,id'],
            'status' => ['required', Rule::enum(LeadStatus::class)],
            'loss_reason' => ['nullable', 'required_if:status,'.LeadStatus::Archived->value, Rule::enum(LeadLossReason::class)],
            'loss_note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Chaque lead coché doit être modifiable par le membre : un seul lead
     * fermé à ses droits refuse toute la demande, rien n'est fait à moitié.
     *
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('ids') || $validator->errors()->has('ids.*')) {
                    return;
                }

                $user = $this->user();
                $forbidden = $this->leads()->first(fn (Lead $lead): bool => ! ($user?->can('update', $lead) ?? false));

                if ($forbidden instanceof Lead) {
                    $validator->errors()->add('ids', __('Vous ne pouvez pas modifier le lead :name.', ['name' => $forbidden->fullName()]));
                }
            },
        ];
    }

    /**
     * @return Collection<int, Lead>
     */
    public function leads(): Collection
    {
        /** @var list<int|string> $ids */
        $ids = $this->validated('ids') ?? $this->input('ids', []);

        return Lead::query()->whereIn('id', array_map(intval(...), $ids))->orderBy('position')->get();
    }

    public function status(): LeadStatus
    {
        return LeadStatus::from((string) $this->validated('status'));
    }

    public function lossReason(): ?LeadLossReason
    {
        $reason = $this->validated('loss_reason');

        return $reason === null ? null : LeadLossReason::from((string) $reason);
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['ids' => 'leads', 'ids.*' => 'lead', 'status' => 'statut', 'loss_reason' => 'motif', 'loss_note' => 'précision'];
    }
}
