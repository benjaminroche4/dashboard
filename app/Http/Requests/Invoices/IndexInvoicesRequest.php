<?php

declare(strict_types=1);

namespace App\Http\Requests\Invoices;

use App\Enums\InvoiceStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Liste des factures paginée côté serveur : recherche, statut, tri, page.
 */
class IndexInvoicesRequest extends FormRequest
{
    /** Colonnes triables, dans les deux sens. */
    public const array SORTS = ['issued_at', 'number', 'client_name', 'status', 'amount_cents', 'due_at'];

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(InvoiceStatus::class)],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function search(): string
    {
        return trim((string) $this->validated('q', ''));
    }

    public function status(): ?InvoiceStatus
    {
        $status = $this->validated('status');

        return is_string($status) ? InvoiceStatus::from($status) : null;
    }

    public function sort(): string
    {
        $sort = $this->validated('sort');

        return is_string($sort) ? $sort : 'issued_at';
    }

    /**
     * @return 'asc'|'desc'
     */
    public function direction(): string
    {
        return $this->validated('dir') === 'asc' ? 'asc' : 'desc';
    }
}
