<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Colonnes du kanban des leads, de la prise de contact à la conversion.
 */
enum LeadStatus: string
{
    case Todo = 'todo';
    case InProgress = 'in_progress';
    case QuoteSent = 'quote_sent';
    case Converted = 'converted';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Todo => 'À traiter',
            self::InProgress => 'En cours',
            self::QuoteSent => 'Devis envoyé',
            self::Converted => 'Converti',
            self::Archived => 'Archivé',
        };
    }

    /** Un lead clos ne demande plus de relance. */
    public function isClosed(): bool
    {
        return $this === self::Converted || $this === self::Archived;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
