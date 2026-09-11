<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Situation professionnelle d'un locataire, telle qu'attendue par les agences.
 */
enum EmploymentStatus: string
{
    case Permanent = 'cdi';
    case FixedTerm = 'cdd';
    case Freelance = 'independant';
    case Student = 'etudiant';
    case Intern = 'stage_alternance';
    case Retired = 'retraite';
    case Unemployed = 'sans_emploi';
    case Other = 'autre';

    public function label(): string
    {
        return match ($this) {
            self::Permanent => 'CDI',
            self::FixedTerm => 'CDD',
            self::Freelance => 'Indépendant',
            self::Student => 'Étudiant',
            self::Intern => 'Stage ou alternance',
            self::Retired => 'Retraité',
            self::Unemployed => 'Sans emploi',
            self::Other => 'Autre',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
