<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\LeadSegment;

/**
 * Lead propriétaire saisi dans la Converting Machine propriétaire : le contact, et le bien proposé s'il est renseigné.
 */
final readonly class OwnerLeadData
{
    public function __construct(
        public LeadData $lead,
        public ?LeadPropertyData $property,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $property = is_array($data['property'] ?? null) ? LeadPropertyData::from($data['property']) : null;

        return new self(
            lead: LeadData::from([...$data, 'segment' => LeadSegment::Owner->value]),
            property: ! $property instanceof LeadPropertyData || $property->isEmpty() ? null : $property,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            ...$this->lead->toArray(),
            'property' => $this->property?->toArray(),
        ];
    }
}
