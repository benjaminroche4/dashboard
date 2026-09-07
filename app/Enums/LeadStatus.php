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

    /**
     * Libellé côté propriétaires : le devis y est un mandat en signature.
     */
    public function ownerLabel(): string
    {
        return $this === self::QuoteSent ? 'En signature' : $this->label();
    }

    /**
     * Colonnes du kanban des leads propriétaires.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function ownerOptions(): array
    {
        return array_map(fn (self $status): array => ['value' => $status->value, 'label' => $status->ownerLabel()], self::cases());
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
