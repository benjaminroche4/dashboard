<?php

declare(strict_types=1);

namespace App\Http\Controllers\Partners;

use App\Actions\Partners\AttachLeadPartner;
use App\Actions\Partners\DetachLeadPartner;
use App\Actions\Partners\DraftPartnerMessage;
use App\Actions\Partners\ForwardLeadDossier;
use App\Enums\PartnerRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partners\AttachLeadPartnerRequest;
use App\Http\Requests\Partners\ForwardLeadDossierRequest;
use App\Models\Lead;
use App\Models\LeadPartner;
use App\Models\Partner;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

/**
 * Partenaires intervenant sur le dossier d'un lead.
 */
class LeadPartnerController extends Controller
{
    use AuthorizesRequests;

    public function store(AttachLeadPartnerRequest $request, Lead $lead, AttachLeadPartner $attach): RedirectResponse
    {
        $partner = Partner::query()->findOrFail((int) $request->validated('partner_id'));
        $link = $attach->handle($lead, $partner, PartnerRole::from((string) $request->validated('role')), $request->validated('note'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':partner ajouté au dossier (:role).', ['partner' => $partner->name, 'role' => $link->role->label()])]);

        return back();
    }

    public function destroy(Lead $lead, LeadPartner $partnerLink, DetachLeadPartner $detach): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($partnerLink->lead_id === $lead->id, 404);

        $name = $partnerLink->partner->name;
        $detach->handle($partnerLink, request()->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':partner retiré du dossier.', ['partner' => $name])]);

        return back();
    }

    /** Mot d'accompagnement proposé par l'assistant ; le conseiller relit avant d'envoyer. */
    public function draftForward(Request $request, Lead $lead, LeadPartner $partnerLink, DraftPartnerMessage $draft): JsonResponse
    {
        $this->authorize('view', $lead);
        abort_unless($partnerLink->lead_id === $lead->id, 404);

        try {
            $message = $draft->handle($partnerLink, $request->user());
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['message' => $message]);
    }

    public function forward(ForwardLeadDossierRequest $request, Lead $lead, LeadPartner $partnerLink, ForwardLeadDossier $forward): RedirectResponse
    {
        abort_unless($partnerLink->lead_id === $lead->id, 404);

        $forward->handle($partnerLink, (string) $request->validated('email'), $request->validated('message'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier transmis à :email.', ['email' => (string) $request->validated('email')])]);

        return back();
    }
}
