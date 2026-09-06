<?php

declare(strict_types=1);

namespace App\Http\Requests\Leads;

use App\Models\LeadNote;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var LeadNote|null $note */
        $note = $this->route('note');

        return $note !== null && ($this->user()?->can('update', $note) ?? false);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'max:5000']];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['body' => 'note'];
    }
}
