<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Profils de locataire (ou de garant) et les pièces qu'on leur demande
 * d'habitude : cocher trente cases à la main pour chaque dossier coûte du
 * temps, un profil les coche d'un clic. L'équipe reste libre d'ajuster ensuite.
 *
 * Les valeurs sont des **clés du catalogue** (`catalog_documents.key`) :
 * `tests/Feature/Documents/DocumentPresetTest.php` vérifie qu'aucune ne
 * disparaît du catalogue.
 */
enum DocumentPreset: string
{
    case Freelance = 'freelance';
    case FreelanceCompany = 'freelance_company';
    case Employee = 'employee';
    case Student = 'student';
    case StudentInternship = 'student_internship';
    case StudentApprenticeship = 'student_apprenticeship';

    /** Identité : le même socle pour tout le monde. */
    private const array IDENTITY = [
        'identity_document',
        'visa_or_residence_permit',
        'residence_permit_renewal_receipt',
    ];

    /** Dossier de présentation : demandé à tous les profils. */
    private const array PRESENTATION = [
        'information_sheet',
        'presentation_letter',
    ];

    /** Logement actuel : quittances, hébergement, domicile. */
    private const array HOUSING = [
        'rent_receipts',
        'host_certificate',
        'proof_of_address',
        'temporary_housing_invoice',
    ];

    public function label(): string
    {
        return match ($this) {
            self::Freelance => 'Freelance sans société',
            self::FreelanceCompany => 'Freelance avec société',
            self::Employee => 'Salarié',
            self::Student => 'Étudiant',
            self::StudentInternship => 'Étudiant en stage',
            self::StudentApprenticeship => 'Étudiant en alternance',
        };
    }

    /** Famille de profils, pour les regrouper dans le formulaire. */
    public function group(): string
    {
        return match ($this) {
            self::Freelance, self::FreelanceCompany => 'Indépendant',
            self::Employee => 'Salarié',
            self::Student, self::StudentInternship, self::StudentApprenticeship => 'Études',
        };
    }

    /**
     * Pièces du profil, sans doublon et dans l'ordre du catalogue.
     *
     * @return list<string>
     */
    public function documents(): array
    {
        return array_values(array_unique(match ($this) {
            self::Freelance => self::freelance(),
            self::FreelanceCompany => [
                ...self::freelance(),
                // Une société ajoute ses statuts et la répartition du capital.
                'company_statutes',
                'general_meeting_minutes',
            ],
            self::Employee => [
                ...self::IDENTITY,
                'financial_summary',
                'tax_notices',
                'apl_certificate',
                'third_party_coverage',
                'non_taxation_certificate',
                'bank_solvency_certificate',
                'rib',
                'savings_statement',
                'other_proof_of_funds',
                'bank_guarantee',
                'garantme_certificate',
                'visale_certificate',
                ...self::HOUSING,
                'property_tax_notice',
                ...self::PRESENTATION,
                'payslips',
                'stock_grant_certificate',
                'employer_certificate',
                'employment_contract',
                'bonus_letter',
                'transfer_letter',
            ],
            self::Student => self::student(),
            self::StudentInternship => [...self::student(), 'internship_agreement'],
            self::StudentApprenticeship => [
                ...self::student(),
                'apprenticeship_contract',
                'payslips',
            ],
        }));
    }

    /**
     * @return list<string>
     */
    private static function freelance(): array
    {
        return [
            ...self::IDENTITY,
            'financial_summary',
            'tax_return_2035',
            'tax_notices',
            'balance_sheets',
            'business_bank_statements',
            'bank_solvency_certificate',
            'urssaf_turnover',
            'bank_statements',
            'client_invoices',
            'savings_statement',
            'rib',
            'other_proof_of_funds',
            'garantme_certificate',
            ...self::HOUSING,
            'property_tax_notice',
            ...self::PRESENTATION,
            'accountant_certificate',
            'urssaf_certificate',
            'kbis',
        ];
    }

    /**
     * @return list<string>
     */
    private static function student(): array
    {
        return [
            ...self::IDENTITY,
            'student_card',
            'school_certificate',
            'scholarship_certificate',
            'apl_certificate',
            'third_party_coverage',
            'rib',
            'garantme_certificate',
            'visale_certificate',
            ...self::HOUSING,
            ...self::PRESENTATION,
        ];
    }

    /**
     * Profils proposés au formulaire, avec leurs pièces.
     *
     * @return list<array{value: string, label: string, group: string, documents: list<string>}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => [
            'value' => $case->value,
            'label' => $case->label(),
            'group' => $case->group(),
            'documents' => $case->documents(),
        ], self::cases());
    }
}
