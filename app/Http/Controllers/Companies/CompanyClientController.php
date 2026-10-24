<?php

declare(strict_types=1);

namespace App\Http\Controllers\Companies;

use App\Actions\Companies\AttachCompanyClient;
use App\Actions\Companies\DetachCompanyClient;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\AttachCompanyClientRequest;
use App\Models\Company;
use App\Models\Lead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Dossiers clients rattachés à une entreprise.
 */
class CompanyClientController extends Controller
{
    use AuthorizesRequests;

    public function store(AttachCompanyClientRequest $request, Company $company, AttachCompanyClient $attach): RedirectResponse
    {
        $this->authorize('update', $company);

        $lead = $request->lead();
        $attach->handle($company, $lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier de :name rattaché à :company.', ['name' => $lead->householdName(), 'company' => $company->name])]);

        return back();
    }

    public function destroy(Request $request, Company $company, Lead $lead, DetachCompanyClient $detach): RedirectResponse
    {
        $this->authorize('update', $company);

        abort_unless($lead->company_id === $company->id, 404);

        $detach->handle($company, $lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier de :name détaché de :company.', ['name' => $lead->householdName(), 'company' => $company->name])]);

        return back();
    }
}
