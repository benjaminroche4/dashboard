<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invoices;

use App\Enums\InvoiceStatus;
use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Invoice::class);

        $invoices = Invoice::query()
            ->latest('issued_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'client_email' => $invoice->client_email,
                'amount_cents' => $invoice->amount_cents,
                'currency' => $invoice->currency,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at->toDateString(),
                'due_at' => $invoice->due_at->toDateString(),
                'paid_at' => $invoice->paid_at?->toDateString(),
            ])
            ->all();

        return Inertia::render('invoices/index', [
            'invoices' => $invoices,
            'statuses' => collect(InvoiceStatus::cases())
                ->map(fn (InvoiceStatus $status): array => ['value' => $status->value, 'label' => $status->label()])
                ->all(),
        ]);
    }
}
