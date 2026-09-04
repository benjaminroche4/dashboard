<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Étapes du suivi d'un lead, de la prise de contact à la conversion.
 */
enum LeadStatus: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case InDiscussion = 'in_discussion';
    case Converted = 'converted';
    case Lost = 'lost';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Nouveau',
            self::Contacted => 'Contacté',
            self::InDiscussion => 'En discussion',
            self::Converted => 'Converti',
            self::Lost => 'Perdu',
        };
    }

    /** Un lead clos ne demande plus de relance. */
    public function isClosed(): bool
    {
        return $this === self::Converted || $this === self::Lost;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
