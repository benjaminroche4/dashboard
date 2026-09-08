<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owners;

use App\Actions\Owners\CreateOwnerLead;
use App\Actions\Owners\UpdateOwnerLead;
use App\Data\OwnerLeadData;
use App\Enums\Furnished;
use App\Enums\LeadLanguage;
use App\Enums\LeadSegment;
use App\Enums\LeadSource;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerPropertyType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Owners\StoreOwnerLeadRequest;
use App\Http\Requests\Owners\UpdateOwnerLeadRequest;
use App\Models\Lead;
use App\Models\LeadProperty;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Converting Machine propriétaire : le formulaire « Proposer un bien » du site, côté équipe.
 */
class OwnerLeadController extends Controller
{
    use AuthorizesRequests;

    public function create(): Response
    {
        $this->authorize('create', Lead::class);

        return Inertia::render('owners/create', $this->formProps());
    }

    public function store(StoreOwnerLeadRequest $request, CreateOwnerLead $createOwnerLead): RedirectResponse
    {
        $lead = $createOwnerLead->handle(OwnerLeadData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead propriétaire :name ajouté.', ['name' => $lead->fullName()])]);

        return to_route('owners.leads');
    }

    public function edit(Lead $lead): Response
    {
        $this->authorize('update', $lead);

        // Seul un lead propriétaire se modifie ici ; un lead locataire passe par la Converting Machine.
        abort_unless(LeadSegment::fromLead($lead) === LeadSegment::Owner, 404);

        $lead->load(['property']);

        return Inertia::render('owners/create', [
            ...$this->formProps(),
            'lead' => [
                'id' => $lead->id,
                'uuid' => $lead->uuid,
                'name' => $lead->fullName(),
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email ?? '',
                'phone' => $lead->phone ?? '',
                'company' => $lead->company ?? '',
                'language' => $lead->language->value,
                'source' => $lead->source->value,
                'source_note' => $lead->source_note ?? '',
                'assigned_to' => $lead->assigned_to,
                'property' => self::property($lead->property),
            ],
        ]);
    }

    public function update(UpdateOwnerLeadRequest $request, Lead $lead, UpdateOwnerLead $updateOwnerLead): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless(LeadSegment::fromLead($lead) === LeadSegment::Owner, 404);

        $lead = $updateOwnerLead->handle($lead, OwnerLeadData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Lead :name mis à jour.', ['name' => $lead->fullName()])]);

        return to_route('leads.show', $lead);
    }

    /**
     * Bien proposé, tel que le formulaire le reprend (null quand il n'existe pas, listes vides à défaut).
     *
     * @return array<string, mixed>|null
     */
    public static function property(?LeadProperty $property): ?array
    {
        if (! $property instanceof LeadProperty) {
            return null;
        }

        return [
            'address' => $property->address,
            'place_id' => $property->place_id,
            'property_type' => $property->property_type?->value,
            'property_status' => $property->property_status?->value,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'surface' => $property->surface,
            'floor' => $property->floor,
            'building_floors' => $property->building_floors,
            'furnishing' => $property->furnishing?->value,
            'orientations' => $property->orientations?->map(fn (Orientation $orientation): string => $orientation->value)->values()->all() ?? [],
            'lease_types' => $property->lease_types?->map(fn (LeaseType $type): string => $type->value)->values()->all() ?? [],
            'rent_cents' => $property->rent_cents,
            'charges_cents' => $property->charges_cents,
            'deposit_cents' => $property->deposit_cents,
            'amenities' => $property->amenities?->map(fn (PropertyAmenity $amenity): string => $amenity->value)->values()->all() ?? [],
            'note' => $property->note,
        ];
    }

    /**
     * Même forme, avec les libellés pour la fiche lead.
     *
     * @return array<string, mixed>|null
     */
    public static function propertyDetail(?LeadProperty $property): ?array
    {
        $base = self::property($property);

        if ($base === null || ! $property instanceof LeadProperty) {
            return null;
        }

        return [
            ...$base,
            'property_type_label' => $property->property_type?->label(),
            'property_status_label' => $property->property_status?->label(),
            'furnishing_label' => $property->furnishing === null ? null : ($property->furnishing === Furnished::Unfurnished ? 'Vide' : $property->furnishing->label()),
            'orientation_labels' => $property->orientations?->map(fn (Orientation $orientation): string => $orientation->label())->values()->all() ?? [],
            'lease_type_labels' => $property->lease_types?->map(fn (LeaseType $type): string => $type->label())->values()->all() ?? [],
            'amenity_labels' => $property->amenities?->map(fn (PropertyAmenity $amenity): string => $amenity->label())->values()->all() ?? [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formProps(): array
    {
        return [
            'languages' => LeadLanguage::options(),
            'sources' => array_map(
                fn (LeadSource $source): array => ['value' => $source->value, 'label' => $source->label()],
                LeadSource::cases(),
            ),
            'propertyTypes' => OwnerPropertyType::options(),
            'propertyStatuses' => PropertyStatus::options(),
            'leaseTypes' => LeaseType::options(),
            'orientations' => Orientation::options(),
            'amenities' => PropertyAmenity::options(),
            'furnishingOptions' => [
                ['value' => Furnished::Furnished->value, 'label' => 'Meublé'],
                ['value' => Furnished::Unfurnished->value, 'label' => 'Vide'],
            ],
        ];
    }
}
