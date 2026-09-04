<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client minimal DocRaptor : HTML → PDF.
 * En test_mode, le PDF porte un filigrane et n'est pas facturé.
 */
final readonly class DocRaptor
{
    public function __construct(
        private ?string $key,
        private bool $testMode,
        private string $endpoint,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            key: config('services.docraptor.key'),
            testMode: (bool) config('services.docraptor.test_mode', true),
            endpoint: (string) config('services.docraptor.endpoint'),
        );
    }

    public function isConfigured(): bool
    {
        return $this->key !== null && $this->key !== '';
    }

    /**
     * Retourne le contenu binaire du PDF.
     *
     * @throws RuntimeException si la clé manque ou si l'API échoue
     */
    public function pdf(string $html, string $name): string
    {
        throw_unless($this->isConfigured(), RuntimeException::class, 'DocRaptor n\'est pas configuré (DOC_RAPTOR_KEY).');

        $response = Http::withBasicAuth((string) $this->key, '')
            ->timeout(60)
            ->post($this->endpoint, [
                'test' => $this->testMode,
                'document_type' => 'pdf',
                'name' => $name,
                'document_content' => $html,
                'prince_options' => ['media' => 'print', 'profile' => 'PDF/A-3b'],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('DocRaptor a répondu '.$response->status().' : '.$response->body());
        }

        return $response->body();
    }
}
