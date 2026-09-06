<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Enums\LeadMailItem;
use App\Enums\PaymentPlan;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendLeadDossierRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*' => [Rule::enum(LeadMailItem::class), 'distinct'],
            'payment_plan' => ['nullable', Rule::enum(PaymentPlan::class)],
        ];
    }

    /**
     * @return list<LeadMailItem>
     */
    public function items(): array
    {
        /** @var list<string> $values */
        $values = $this->validated('items');

        return array_map(LeadMailItem::from(...), $values);
    }

    public function plan(): PaymentPlan
    {
        $value = $this->validated('payment_plan');

        return is_string($value) ? PaymentPlan::from($value) : PaymentPlan::Full;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['items' => 'éléments à envoyer', 'payment_plan' => 'modalité de paiement'];
    }
}
