<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use Carbon\CarbonImmutable;

/**
 * Modification d'une visite : ce que le formulaire de la fiche peut changer.
 * Chaque champ absent (`null`) laisse la valeur en place.
 */
final readonly class VisitUpdateData
{
    public function __construct(
        public ?VisitStatus $status = null,
        public ?VisitMode $mode = null,
        public ?CarbonImmutable $scheduledAt = null,
        public ?string $notes = null,
        public ?int $propertyId = null,
        public ?int $agentId = null,
        public ?int $assignedTo = null,
        /** Vider l'agent immobilier de la visite. */
        public bool $clearAgent = false,
        /** Vider le membre qui réalise la visite. */
        public bool $clearAssignee = false,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $status = $data['status'] ?? null;
        $scheduledAt = $data['scheduled_at'] ?? null;

        $mode = $data['mode'] ?? null;

        return new self(
            status: is_string($status) && $status !== '' ? VisitStatus::from($status) : null,
            mode: is_string($mode) && $mode !== '' ? VisitMode::from($mode) : null,
            scheduledAt: is_string($scheduledAt) && $scheduledAt !== ''
                ? CarbonImmutable::parse($scheduledAt, config('app.timezone'))
                : null,
            notes: is_string($data['notes'] ?? null) ? $data['notes'] : null,
            propertyId: self::id($data['property_id'] ?? null),
            agentId: self::id($data['agent_id'] ?? null),
            assignedTo: self::id($data['assigned_to'] ?? null),
            clearAgent: array_key_exists('agent_id', $data) && self::id($data['agent_id']) === null,
            clearAssignee: array_key_exists('assigned_to', $data) && self::id($data['assigned_to']) === null,
        );
    }

    /** Identifiant envoyé par le formulaire, null quand le champ est vide. */
    private static function id(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }
}
