<?php

declare(strict_types=1);

namespace App\Http\Controllers\Companies;

use App\Actions\Companies\CreateCompanyContact;
use App\Actions\Companies\DeleteCompanyContact;
use App\Actions\Companies\UpdateCompanyContact;
use App\Data\CompanyContactData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\StoreCompanyContactRequest;
use App\Http\Requests\Companies\UpdateCompanyContactRequest;
use App\Models\Company;
use App\Models\CompanyContact;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CompanyContactController extends Controller
{
    use AuthorizesRequests;

    public function store(StoreCompanyContactRequest $request, Company $company, CreateCompanyContact $create): RedirectResponse
    {
        $this->authorize('update', $company);

        $contact = $create->handle($company, CompanyContactData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name ajouté(e) chez :company.', ['name' => $contact->fullName(), 'company' => $company->name])]);

        return back();
    }

    public function update(UpdateCompanyContactRequest $request, Company $company, CompanyContact $contact, UpdateCompanyContact $update): RedirectResponse
    {
        $this->authorize('update', $company);

        $contact = $update->handle($contact, CompanyContactData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name mis(e) à jour.', ['name' => $contact->fullName()])]);

        return back();
    }

    public function destroy(Request $request, Company $company, CompanyContact $contact, DeleteCompanyContact $delete): RedirectResponse
    {
        $this->authorize('update', $company);

        $name = $contact->fullName();
        $delete->handle($contact, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name retiré(e).', ['name' => $name])]);

        return back();
    }
}
