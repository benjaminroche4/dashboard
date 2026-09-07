<?php

declare(strict_types=1);

namespace App\Http\Controllers\Partners;

use App\Actions\Partners\CreatePartnerContact;
use App\Actions\Partners\DeletePartnerContact;
use App\Actions\Partners\UpdatePartnerContact;
use App\Data\PartnerContactData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partners\StorePartnerContactRequest;
use App\Http\Requests\Partners\UpdatePartnerContactRequest;
use App\Models\Partner;
use App\Models\PartnerContact;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class PartnerContactController extends Controller
{
    use AuthorizesRequests;

    public function store(StorePartnerContactRequest $request, Partner $partner, CreatePartnerContact $create): RedirectResponse
    {
        $this->authorize('update', $partner);

        $contact = $create->handle($partner, PartnerContactData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name ajouté(e) chez :partner.', ['name' => $contact->fullName(), 'partner' => $partner->name])]);

        return back();
    }

    public function update(UpdatePartnerContactRequest $request, Partner $partner, PartnerContact $contact, UpdatePartnerContact $update): RedirectResponse
    {
        $this->authorize('update', $partner);

        $contact = $update->handle($contact, PartnerContactData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name mis(e) à jour.', ['name' => $contact->fullName()])]);

        return back();
    }

    public function destroy(Partner $partner, PartnerContact $contact, DeletePartnerContact $delete): RedirectResponse
    {
        $this->authorize('update', $partner);

        $name = $contact->fullName();
        $delete->handle($contact);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name retiré(e).', ['name' => $name])]);

        return back();
    }
}
