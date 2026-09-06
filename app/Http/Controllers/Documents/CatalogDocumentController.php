<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documents;

use App\Actions\Documents\CreateCatalogDocument;
use App\Actions\Documents\DeleteCatalogDocument;
use App\Actions\Documents\UpdateCatalogDocument;
use App\Data\CatalogDocumentData;
use App\Enums\DocumentCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Documents\StoreCatalogDocumentRequest;
use App\Http\Requests\Documents\UpdateCatalogDocumentRequest;
use App\Models\CatalogDocument;
use App\Support\DocumentCatalog;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CatalogDocumentController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', CatalogDocument::class);

        return Inertia::render('documents/catalog', [
            'groups' => DocumentCatalog::administrable(),
            'categories' => DocumentCategory::options(),
        ]);
    }

    public function store(StoreCatalogDocumentRequest $request, CreateCatalogDocument $create): RedirectResponse
    {
        $this->authorize('create', CatalogDocument::class);

        $document = $create->handle(CatalogDocumentData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pièce « :label » ajoutée au catalogue.', ['label' => $document->label])]);

        return back();
    }

    public function update(UpdateCatalogDocumentRequest $request, CatalogDocument $catalogDocument, UpdateCatalogDocument $update): RedirectResponse
    {
        $this->authorize('update', $catalogDocument);

        $document = $update->handle($catalogDocument, CatalogDocumentData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pièce « :label » mise à jour.', ['label' => $document->label])]);

        return back();
    }

    public function destroy(CatalogDocument $catalogDocument, DeleteCatalogDocument $delete): RedirectResponse
    {
        $this->authorize('delete', $catalogDocument);

        $label = $catalogDocument->label;
        $delete->handle($catalogDocument);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pièce « :label » retirée du catalogue.', ['label' => $label])]);

        return back();
    }
}
