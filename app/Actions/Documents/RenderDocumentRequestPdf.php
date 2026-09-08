<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Actions\Invoices\SendInvoice;
use App\Enums\HouseholdRole;
use App\Models\DocumentRequest;
use App\Services\DocRaptor;
use App\Support\DocumentCatalog;
use Illuminate\Support\Facades\App;

/**
 * Rend la demande de pièces en HTML (dans la langue du client) puis en PDF
 * via DocRaptor.
 */
final readonly class RenderDocumentRequestPdf
{
    public function __construct(private DocRaptor $docRaptor) {}

    public function handle(DocumentRequest $request): string
    {
        return $this->docRaptor->pdf($this->html($request), self::fileName($request));
    }

    public function isConfigured(): bool
    {
        return $this->docRaptor->isConfigured();
    }

    /**
     * HTML du document, rendu dans la langue de la demande.
     */
    public function html(DocumentRequest $request): string
    {
        $previous = App::getLocale();
        App::setLocale($request->language->value);

        try {
            return view('documents.request', [
                'request' => $request,
                'fr' => $request->language->value !== 'en',
                'persons' => self::persons($request),
                'company' => config('company'),
                'logo' => SendInvoice::logoDataUri(),
            ])->render();
        } finally {
            App::setLocale($previous);
        }
    }

    /**
     * Personnes avec leurs pièces libellées et traduites dans la locale
     * courante, regroupées par catégorie dans l'ordre du catalogue.
     *
     * @return list<array{name: string, role: string, categories: list<array{value: string, label: string, documents: list<array{key: string, label: string, hint: string|null}>}>}>
     */
    public static function persons(DocumentRequest $request): array
    {
        $catalog = DocumentCatalog::grouped();

        return array_map(function (array $person) use ($catalog): array {
            $categories = [];

            foreach ($catalog as $group) {
                $keys = array_values(array_filter(
                    array_map(fn (array $item): string => $item['key'], $group['items']),
                    fn (string $key): bool => in_array($key, $person['documents'], true),
                ));

                if ($keys === []) {
                    continue;
                }

                $categories[] = [
                    'value' => $group['value'],
                    'label' => __($group['label']),
                    'documents' => array_map(fn (string $key): array => [
                        'key' => $key,
                        'label' => DocumentCatalog::label($key),
                        'hint' => DocumentCatalog::hint($key),
                    ], $keys),
                ];
            }

            return [
                'name' => trim(($person['first_name'] ?? '').' '.($person['last_name'] ?? '')),
                'role' => __(HouseholdRole::from($person['role'])->label()),
                'categories' => $categories,
            ];
        }, $request->persons);
    }

    public static function fileName(DocumentRequest $request): string
    {
        $slug = str($request->fullName())->slug()->value();

        return ($request->language->value === 'en' ? 'documents-' : 'pieces-').($slug !== '' ? $slug : $request->id).'.pdf';
    }
}
