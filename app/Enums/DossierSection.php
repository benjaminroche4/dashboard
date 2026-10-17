<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Parties du dossier de location fusionné, **dans l'ordre où une agence le
 * lit** : qui est la personne, ce qu'elle fait, ce qu'elle gagne, ce qu'elle
 * déclare, ce qu'elle a de côté, ses aides, ses garanties, où elle habite.
 * Chaque partie ouvre sur une fiche récapitulative rédigée par l'assistant.
 *
 * Les catégories du catalogue (Finance, Travail…) servent au formulaire ;
 * elles mélangent dans « Finance » les impôts, les relevés et l'épargne, que
 * le dossier sépare. D'où cette seconde grille, par **thème**.
 */
enum DossierSection: string
{
    case Identity = 'identity';
    case Employment = 'employment';
    case Income = 'income';
    case Taxes = 'taxes';
    case Savings = 'savings';
    case Aid = 'aid';
    case Guarantee = 'guarantee';
    case Housing = 'housing';
    case Studies = 'studies';
    case Other = 'other';

    /**
     * Pièces du catalogue rattachées à chaque thème. Une pièce ajoutée au
     * catalogue sans y figurer suit sa catégorie (`fromCategory()`).
     */
    private const array KEYS = [
        'identity_document' => self::Identity,
        'visa_or_residence_permit' => self::Identity,
        'residence_permit_renewal_receipt' => self::Identity,
        'diplomatic_passport' => self::Identity,
        'family_record_book' => self::Identity,
        'organisation_id_card' => self::Identity,
        'professional_card' => self::Identity,
        'employment_contract' => self::Employment,
        'employer_certificate' => self::Employment,
        'position_certificate' => self::Employment,
        'apprenticeship_contract' => self::Employment,
        'kbis' => self::Employment,
        'sirene_notice' => self::Employment,
        'urssaf_certificate' => self::Employment,
        'professional_registration' => self::Employment,
        'accountant_certificate' => self::Employment,
        'payslips' => self::Income,
        'bonus_letter' => self::Income,
        'stock_grant_certificate' => self::Income,
        'pension_slips' => self::Income,
        'pension_title' => self::Income,
        'urssaf_turnover' => self::Income,
        'client_invoices' => self::Income,
        'balance_sheets' => self::Income,
        'tax_return_2035' => self::Income,
        'general_meeting_minutes' => self::Income,
        'tax_notices' => self::Taxes,
        'non_taxation_certificate' => self::Taxes,
        'savings_statement' => self::Savings,
        'bank_statements' => self::Savings,
        'business_bank_statements' => self::Savings,
        'rib' => self::Savings,
        'bank_solvency_certificate' => self::Savings,
        'wealth_management_certificate' => self::Savings,
        'other_proof_of_funds' => self::Savings,
        'financial_summary' => self::Savings,
        'apl_certificate' => self::Aid,
        'third_party_coverage' => self::Aid,
        'scholarship_certificate' => self::Aid,
        'relocation_certificate' => self::Aid,
        'bank_guarantee' => self::Guarantee,
        'garantme_certificate' => self::Guarantee,
        'visale_certificate' => self::Guarantee,
        'embassy_guarantee' => self::Guarantee,
        'rent_receipts' => self::Housing,
        'host_certificate' => self::Housing,
        'organisation_housing_certificate' => self::Housing,
        'property_tax_notice' => self::Housing,
        'temporary_housing_invoice' => self::Housing,
        'proof_of_address' => self::Housing,
        'student_card' => self::Studies,
        'school_certificate' => self::Studies,
        'internship_agreement' => self::Studies,
        'information_sheet' => self::Other,
        'presentation_letter' => self::Other,
    ];

    public function label(): string
    {
        return match ($this) {
            self::Identity => 'Identité et séjour',
            self::Employment => 'Situation professionnelle',
            self::Income => 'Revenus et salaires',
            self::Taxes => 'Impôts',
            self::Savings => 'Épargne et banque',
            self::Aid => 'Aides et prises en charge',
            self::Guarantee => 'Garanties',
            self::Housing => 'Logement actuel',
            self::Studies => 'Études',
            self::Other => 'Autres pièces',
        };
    }

    /** Ce que la fiche récapitulative de la partie doit relever dans les pièces. */
    public function focus(): string
    {
        return match ($this) {
            self::Identity => 'identité complète, nationalité, date de naissance, nature et validité du titre de séjour ou du visa, situation familiale.',
            self::Employment => 'employeur ou activité, poste, type de contrat, date d’entrée, période d’essai, rémunération annoncée, santé de l’activité pour un indépendant.',
            self::Income => 'revenu net mensuel de chaque bulletin ou période, moyenne sur la période couverte, primes et variable, régularité, revenu annuel.',
            self::Taxes => 'revenu fiscal de référence de chaque avis, nombre de parts, année, impôt dû, cohérence avec les salaires.',
            self::Savings => 'solde des comptes et de l’épargne, flux entrants réguliers, découverts ou incidents, banque, montant total de l’épargne disponible.',
            self::Aid => 'organisme payeur, montant pris en charge, durée, conditions.',
            self::Guarantee => 'type de garantie, organisme, montant couvert ou plafond, validité, bénéficiaire.',
            self::Housing => 'adresse actuelle, loyer payé, régularité des quittances, hébergeur ou bailleur, ancienneté.',
            self::Studies => 'établissement, formation, année en cours, durée restante, stage ou alternance et son entreprise.',
            self::Other => 'ce que chaque pièce apporte au dossier.',
        };
    }

    /** Thème d'une pièce du catalogue : sa clé si elle est connue, sa catégorie sinon. */
    public static function forDocument(string $key, DocumentCategory $category): self
    {
        return self::KEYS[$key] ?? self::fromCategory($category);
    }

    public static function fromCategory(DocumentCategory $category): self
    {
        return match ($category) {
            DocumentCategory::Studies => self::Studies,
            DocumentCategory::Finance => self::Savings,
            DocumentCategory::Guarantee => self::Guarantee,
            DocumentCategory::Housing => self::Housing,
            DocumentCategory::Identity => self::Identity,
            DocumentCategory::Other => self::Other,
            DocumentCategory::Work => self::Employment,
        };
    }

    /** Rang dans le dossier, pour trier. */
    public function rank(): int
    {
        return (int) array_search($this, self::cases(), true);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $section): array => ['value' => $section->value, 'label' => $section->label()], self::cases());
    }
}
