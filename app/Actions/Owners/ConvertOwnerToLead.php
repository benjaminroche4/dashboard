<?php

declare(strict_types=1);

namespace App\Actions\Owners;

use App\Actions\Leads\CreateLead;
use App\Data\LeadData;
use App\Enums\Currency;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\OwnerStatus;
use App\Enums\WebsiteHelpType;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Crée le lead « gestion locative » d'un propriétaire intéressé : il rejoint
 * le kanban avec ses coordonnées, le propriétaire garde le lien vers ce lead.
 */
final readonly class ConvertOwnerToLead
{
    public function __construct(private CreateLead $createLead) {}

    /**
     * @throws ValidationException si un lead existe déjà pour ce propriétaire
     */
    public function handle(Owner $owner, ?User $by = null): Lead
    {
        if ($owner->lead_id !== null && $owner->lead()->exists()) {
            throw ValidationException::withMessages(['lead' => __('Un lead existe déjà pour ce propriétaire.')]);
        }

        return DB::transaction(function () use ($owner, $by): Lead {
            $lead = $this->createLead->handle(new LeadData(
                firstName: $owner->first_name,
                lastName: $owner->last_name,
                email: $owner->email,
                phone: $owner->phone,
                company: $owner->company,
                language: LeadLanguage::French,
                offer: null,
                source: LeadSource::Other,
                sourceNote: __('Propriétaire prospecté · :count bien(s)', ['count' => $owner->property_count]),
                budgetCents: null,
                currency: Currency::EUR,
                arrivalAt: null,
                districts: [],
                propertyTypes: [],
                duration: null,
                guarantors: [],
                furnished: null,
                originCity: null,
                message: $owner->notes,
                score: null,
                recontactChannel: null,
                recontactAt: null,
                qualificationNote: null,
                assignedTo: $by?->id,
            ), $by);

            $lead->forceFill(['help_type' => WebsiteHelpType::RentalManagement])->save();

            $owner->forceFill([
                'lead_id' => $lead->id,
                'status' => $owner->status === OwnerStatus::ToContact || $owner->status === OwnerStatus::Contacted ? OwnerStatus::Interested : $owner->status,
                'last_contacted_at' => $owner->last_contacted_at ?? now(),
            ])->save();

            event(new DashboardUpdated('owners', ['id' => $owner->id, 'lead_id' => $lead->id], "a créé le lead du propriétaire {$owner->fullName()}"));

            return $lead;
        });
    }
}
