<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Enums\PartnerRole;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadPartner;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Fait intervenir un partenaire sur le dossier d'un lead, avec son rôle.
 * Le même partenaire ne peut pas tenir deux fois le même rôle.
 */
final class AttachLeadPartner
{
    public function handle(Lead $lead, Partner $partner, PartnerRole $role, ?string $note = null, ?User $by = null): LeadPartner
    {
        if ($lead->partnerLinks()->where('partner_id', $partner->id)->where('role', $role->value)->exists()) {
            throw ValidationException::withMessages(['partner_id' => __(':partner intervient déjà sur ce dossier pour « :role ».', ['partner' => $partner->name, 'role' => $role->label()])]);
        }

        $link = $lead->partnerLinks()->create([
            'partner_id' => $partner->id,
            'role' => $role->value,
            'note' => $note,
            'created_by' => $by?->id,
        ]);

        $lead->notes()->create(['body' => "Partenaire ajouté : {$partner->name} ({$role->label()}).", 'user_id' => $by?->id]);

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a ajouté le partenaire {$partner->name} au dossier {$lead->fullName()}"));

        return $link;
    }
}
