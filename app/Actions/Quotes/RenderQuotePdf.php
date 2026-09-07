<?php

declare(strict_types=1);

namespace App\Actions\Quotes;

use App\Actions\Invoices\SendInvoice;
use App\Models\Quote;
use App\Services\DocRaptor;

/**
 * Rend le devis en HTML (vue quotes.pdf) puis en PDF via DocRaptor.
 */
final readonly class RenderQuotePdf
{
    public function __construct(private DocRaptor $docRaptor) {}

    public function html(Quote $quote): string
    {
        return view('quotes.pdf', [
            'quote' => $quote,
            'company' => config('company'),
            'logo' => SendInvoice::logoDataUri(),
        ])->render();
    }

    /**
     * @return string|null Le PDF, ou null si DocRaptor n'est pas configuré.
     */
    public function handle(Quote $quote): ?string
    {
        if (! $this->docRaptor->isConfigured()) {
            return null;
        }

        return $this->docRaptor->pdf($this->html($quote), self::filename($quote));
    }

    public static function filename(Quote $quote): string
    {
        return "devis-{$quote->number}.pdf";
    }
}
