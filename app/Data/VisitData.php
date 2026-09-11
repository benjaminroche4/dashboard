<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\VisitMode;
use Carbon\CarbonImmutable;

/**
 * Données validées d'une visite : le client, la date, et le bien visité,
 * soit existant (`propertyId`), soit à créer dans l'annuaire (`property`).
 */
final readonly class VisitData
{
    public function __construct(
        public int $leadId,
        public ?int $propertyId,
        public ?PropertyData $property,
        public ?int $agentId,
        /** Membre de l'équipe qui réalise la visite. */
        public ?int $assignedTo,
        public CarbonImmutable $scheduledAt,
        /** Visite faite par l'équipe pour le client, ou visite autonome du client. */
        public VisitMode $mode,
        public ?string $notes,
        /** Envoyer la confirmation au client par e-mail. */
        public bool $notifyClient = false,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $propertyId = isset($data['property_id']) && $data['property_id'] !== '' ? (int) $data['property_id'] : null;
        /** @var array<string, mixed>|null $property */
        $property = $propertyId === null && is_array($data['property'] ?? null) ? $data['property'] : null;
        $notes = isset($data['notes']) && is_string($data['notes']) ? trim($data['notes']) : '';

        return new self(
            leadId: (int) $data['lead_id'],
            propertyId: $propertyId,
            property: $property === null ? null : PropertyData::from($property),
            agentId: isset($data['agent_id']) && $data['agent_id'] !== '' ? (int) $data['agent_id'] : null,
            assignedTo: isset($data['assigned_to']) && $data['assigned_to'] !== '' ? (int) $data['assigned_to'] : null,
            scheduledAt: CarbonImmutable::parse((string) $data['scheduled_at'], config('app.timezone')),
            mode: VisitMode::tryFrom((string) ($data['mode'] ?? '')) ?? VisitMode::ForClient,
            notes: $notes === '' ? null : $notes,
            notifyClient: filter_var($data['notify_client'] ?? false, FILTER_VALIDATE_BOOLEAN),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'lead_id' => $this->leadId,
            'property_id' => $this->propertyId,
            'property' => $this->property?->toArray(),
            'agent_id' => $this->agentId,
            'assigned_to' => $this->assignedTo,
            'scheduled_at' => $this->scheduledAt->toIso8601String(),
            'mode' => $this->mode->value,
            'notes' => $this->notes,
            'notify_client' => $this->notifyClient,
        ];
    }
}
