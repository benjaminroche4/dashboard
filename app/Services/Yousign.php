<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Lead;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client minimal Yousign v3 : crée une demande de signature pour un lead
 * à partir d'un PDF, et retourne le lien de signature du signataire.
 */
final readonly class Yousign
{
    public function __construct(
        private ?string $apiKey,
        private string $baseUrl,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            apiKey: config('services.yousign.api_key'),
            baseUrl: rtrim((string) config('services.yousign.base_url'), '/'),
        );
    }

    public function isConfigured(): bool
    {
        return $this->apiKey !== null && $this->apiKey !== '';
    }

    /**
     * @param  string  $pdf  Contenu binaire du contrat
     * @return string URL de signature à transmettre au lead
     *
     * @throws RuntimeException si la clé manque ou si une étape échoue
     */
    public function signatureLink(Lead $lead, string $pdf, string $title): string
    {
        throw_unless($this->isConfigured(), RuntimeException::class, 'Yousign n’est pas configuré (YOUSIGN_API_KEY).');

        throw_if($lead->email === null, RuntimeException::class, 'Le lead n’a pas d’e-mail : impossible de créer la signature.');

        $request = $this->client()->post('/signature_requests', [
            'name' => $title,
            'delivery_mode' => 'none',
            'timezone' => 'Europe/Paris',
        ]);
        $requestId = $this->id($request, 'la demande de signature');

        $document = $this->client()
            ->attach('file', $pdf, 'contrat.pdf', ['Content-Type' => 'application/pdf'])
            ->post("/signature_requests/{$requestId}/documents", ['nature' => 'signable_document']);
        $documentId = $this->id($document, 'le document');

        $signer = $this->client()->post("/signature_requests/{$requestId}/signers", [
            'info' => [
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email,
                'locale' => $lead->language->value,
            ],
            'signature_level' => 'electronic_signature',
            'signature_authentication_mode' => 'no_otp',
            'fields' => [[
                'document_id' => $documentId,
                'type' => 'signature',
                'page' => 1,
                'x' => 77,
                'y' => 581,
            ]],
        ]);
        $signerId = $this->id($signer, 'le signataire');

        $activation = $this->client()->post("/signature_requests/{$requestId}/activate");

        if (! $activation->successful()) {
            throw new RuntimeException('Yousign a refusé l’activation de la demande ('.$activation->status().').');
        }

        foreach ((array) $activation->json('signers', []) as $entry) {
            if (is_array($entry) && ($entry['id'] ?? null) === $signerId && is_string($entry['signature_link'] ?? null)) {
                return $entry['signature_link'];
            }
        }

        throw new RuntimeException('Yousign n’a pas renvoyé de lien de signature.');
    }

    private function client(): PendingRequest
    {
        return Http::withToken((string) $this->apiKey)->acceptJson()->baseUrl($this->baseUrl);
    }

    private function id(Response $response, string $what): string
    {
        $id = $response->json('id');

        if (! $response->successful() || ! is_string($id) || $id === '') {
            throw new RuntimeException("Yousign a refusé {$what} (".$response->status().').');
        }

        return $id;
    }
}
