<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Titre qui autorise le locataire à séjourner en France.
 */
enum ResidencyStatus: string
{
    case EuCitizen = 'ue';
    case LongStayVisa = 'visa_long_sejour';
    case ResidencePermit = 'titre_sejour';
    case TalentPassport = 'passeport_talent';
    case StudentVisa = 'visa_etudiant';
    case Other = 'autre';

    public function label(): string
    {
        return match ($this) {
            self::EuCitizen => 'Citoyen de l’Union européenne',
            self::LongStayVisa => 'Visa long séjour',
            self::ResidencePermit => 'Titre de séjour',
            self::TalentPassport => 'Passeport talent',
            self::StudentVisa => 'Visa étudiant',
            self::Other => 'Autre',
        };
    }

    /** Un citoyen de l'UE n'a ni numéro ni date de validité à fournir. */
    public function needsDocument(): bool
    {
        return $this !== self::EuCitizen;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
