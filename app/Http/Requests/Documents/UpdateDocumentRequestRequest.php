<?php

declare(strict_types=1);

namespace App\Http\Requests\Documents;

use App\Models\DocumentRequest;

class UpdateDocumentRequestRequest extends StoreDocumentRequestRequest
{
    public function authorize(): bool
    {
        /** @var DocumentRequest|null $documentRequest */
        $documentRequest = $this->route('documentRequest');

        return $documentRequest !== null && ($this->user()?->can('update', $documentRequest) ?? false);
    }
}
