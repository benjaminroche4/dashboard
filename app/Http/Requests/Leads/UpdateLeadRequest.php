<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Models\Lead;

class UpdateLeadRequest extends StoreLeadRequest
{
    public function authorize(): bool
    {
        /** @var Lead|null $lead */
        $lead = $this->route('lead');

        return $lead !== null && ($this->user()?->can('update', $lead) ?? false);
    }
}
