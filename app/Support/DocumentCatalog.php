<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\DocumentCategory;
use App\Models\CatalogDocument;

/**
 * Catalogue des pièces qu'un client peut avoir à fournir, lu depuis la table
 * `catalog_documents` (administrable par les admins) et mémorisé le temps
 * de la requête. Les libellés anglais viennent des colonnes `*_en`.
 * `defaults()` garde le contenu initial, utilisé par la migration.
 */
final class DocumentCatalog
{
    /** @var array<string, array{category: DocumentCategory, label: string, hint: string|null, label_en: string|null, hint_en: string|null}>|null */
    private static ?array $cache = null;

    /** Oublie la copie mémorisée : à appeler après toute écriture dans le catalogue. */
    public static function flush(): void
    {
        self::$cache = null;
    }

    /**
     * Pièces dans l'ordre d'affichage (catégorie puis position).
     *
     * @return array<string, array{category: DocumentCategory, label: string, hint: string|null, label_en: string|null, hint_en: string|null}>
     */
    public static function all(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $order = array_flip(array_map(fn (DocumentCategory $category): string => $category->value, DocumentCategory::cases()));
        $documents = CatalogDocument::query()->get()
            ->sortBy(fn (CatalogDocument $document): string => sprintf('%02d-%06d-%06d', $order[$document->category->value], $document->position, $document->id));

        $items = [];

        foreach ($documents as $document) {
            $items[$document->key] = [
                'category' => $document->category,
                'label' => $document->label,
                'hint' => $document->hint,
                'label_en' => $document->label_en,
                'hint_en' => $document->hint_en,
            ];
        }

        return self::$cache = $items;
    }

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::all());
    }

    public static function has(string $key): bool
    {
        return array_key_exists($key, self::all());
    }

    /**
     * Libellé dans la locale courante, clé brute si la pièce a disparu du catalogue.
     */
    public static function label(string $key): string
    {
        $entry = self::all()[$key] ?? null;

        if ($entry === null) {
            return $key;
        }

        return app()->getLocale() === 'en' && $entry['label_en'] !== null ? $entry['label_en'] : $entry['label'];
    }

    /**
     * Aide dans la locale courante, ou null.
     */
    public static function hint(string $key): ?string
    {
        $entry = self::all()[$key] ?? null;

        if ($entry === null || $entry['hint'] === null) {
            return null;
        }

        return app()->getLocale() === 'en' && $entry['hint_en'] !== null ? $entry['hint_en'] : $entry['hint'];
    }

    /**
     * Catalogue prêt pour le formulaire : une entrée par catégorie (même vide) avec ses pièces.
     *
     * @return list<array{value: string, label: string, items: list<array{key: string, label: string, hint: string|null}>}>
     */
    public static function grouped(): array
    {
        return array_map(fn (DocumentCategory $category): array => [
            'value' => $category->value,
            'label' => $category->label(),
            'items' => array_map(
                fn (string $key, array $entry): array => ['key' => $key, 'label' => $entry['label'], 'hint' => $entry['hint']],
                array_keys(self::ofCategory($category)),
                array_values(self::ofCategory($category)),
            ),
        ], DocumentCategory::cases());
    }

    /**
     * Catalogue pour la page d'administration : identifiants et traductions inclus.
     *
     * @return list<array{value: string, label: string, items: list<array{id: int, key: string, label: string, label_en: string|null, hint: string|null, hint_en: string|null}>}>
     */
    public static function administrable(): array
    {
        $byKey = CatalogDocument::query()->get()->keyBy('key');

        return array_map(fn (DocumentCategory $category): array => [
            'value' => $category->value,
            'label' => $category->label(),
            'items' => array_map(function (string $key) use ($byKey): array {
                /** @var CatalogDocument $document */
                $document = $byKey[$key];

                return [
                    'id' => $document->id,
                    'key' => $document->key,
                    'label' => $document->label,
                    'label_en' => $document->label_en,
                    'hint' => $document->hint,
                    'hint_en' => $document->hint_en,
                ];
            }, array_keys(self::ofCategory($category))),
        ], DocumentCategory::cases());
    }

    /**
     * @return array<string, array{category: DocumentCategory, label: string, hint: string|null, label_en: string|null, hint_en: string|null}>
     */
    private static function ofCategory(DocumentCategory $category): array
    {
        return array_filter(self::all(), fn (array $entry): bool => $entry['category'] === $category);
    }

    /**
     * Contenu initial du catalogue : catégorie => clé => [libellé, aide].
     *
     * @return array<string, array<string, array{0: string, 1: string|null}>>
     */
    public static function defaults(): array
    {
        return [
            DocumentCategory::Studies->value => [
                'student_card' => ['Carte Étudiant', 'Pour l\'année en cours et la suivante, si applicable'],
                'school_certificate' => ['Certificat de scolarité', 'Pour l\'année en cours et la suivante, si applicable'],
                'internship_agreement' => ['Convention de stage', 'Contrat tripartite entre l\'école, l\'entreprise et vous'],
            ],
            DocumentCategory::Finance->value => [
                'financial_summary' => ['Synthèse financière', 'Un résumé écrit par votre banque ou vous-mêmes de toutes vos sources de revenus ainsi que de leur montant'],
                'tax_return_2035' => ['2 dernières déclarations 2035', 'Ou tout autre équivalent de liasse fiscale'],
                'tax_notices' => ['2 derniers avis d\'imposition', 'Les vôtres ou ceux de vos parents si vous êtes rattaché'],
                'balance_sheets' => ['2 derniers bilans et comptes de résultat', null],
                'pension_slips' => ['3 derniers bulletins de pension', null],
                'business_bank_statements' => ['3 derniers mois de relevés de compte professionnel', null],
                'apl_certificate' => ['Attestation d\'APL', 'Si vous avez droit à des aides au logement'],
                'third_party_coverage' => ['Attestation de « prise en charge » par un tiers', 'Si une partie du loyer est payée par une entreprise, une association ou un proche'],
                'scholarship_certificate' => ['Attestation de bourse', 'Si applicable'],
                'wealth_management_certificate' => ['Attestation de gestion de patrimoine', 'Une lettre d\'une banque ou d\'un cabinet de gestion confirmant la nature et la pérennité des rentes'],
                'non_taxation_certificate' => ['Attestation de non-imposition', 'Liée au statut diplomatique'],
                'bank_solvency_certificate' => ['Attestation de solvabilité bancaire', 'Lettre de votre banque disant que vous êtes un client sérieux avec des fonds suffisants'],
                'urssaf_turnover' => ['Déclarations de chiffre d\'affaires URSSAF', 'Les 3 ou 4 derniers formulaires trimestriels (ou les 12 derniers mensuels)'],
                'bank_statements' => ['Extraits de comptes bancaires', 'Ceux des 3 derniers mois'],
                'general_meeting_minutes' => ['Procès-verbal d\'assemblée générale', 'Si rémunération en dividendes'],
                'client_invoices' => ['Récentes factures et contrats avec clients', null],
                'savings_statement' => ['Relevé d\'épargne', 'Compte titres, assurance-vie, livrets ou autre'],
                'rib' => ['RIB', 'Français de préférence'],
                'other_proof_of_funds' => ['Toute autre preuve de fonds', 'Épargnes, investissements, revenus immobiliers ou autre'],
            ],
            DocumentCategory::Guarantee->value => [
                'bank_guarantee' => ['Caution bancaire', 'Équivalent à 6 mois de loyer'],
                'garantme_certificate' => ['Certificat Garantme', 'Justificatif d\'éligibilité à la garantie Garantme'],
                'visale_certificate' => ['Certificat VISALE', 'Justificatif d\'éligibilité à la garantie VISALE'],
                'embassy_guarantee' => ['Garantie de l\'Ambassade', 'Si possible'],
            ],
            DocumentCategory::Housing->value => [
                'rent_receipts' => ['3 dernières quittances de loyer', 'Ou attestation d\'hébergement (si logé par un tiers ou vos parents)'],
                'host_certificate' => ['Attestation d\'hébergement', 'Si vous êtes hébergé chez un tiers. Joindre également pièce d\'identité et justificatif de domicile de cette personne'],
                'organisation_housing_certificate' => ['Attestation de l\'organisation', 'Si vous étiez précédemment logé par votre institution'],
                'property_tax_notice' => ['Dernier avis de taxe foncière', 'Si vous êtes propriétaire'],
                'temporary_housing_invoice' => ['Facture logement temporaire', 'Si en logement temporaire'],
                'proof_of_address' => ['Justificatif de domicile', 'Facture EDF, Internet, eau'],
            ],
            DocumentCategory::Identity->value => [
                'identity_document' => ['Passeport ou carte d\'identité', 'Recto et verso'],
                'organisation_id_card' => ['Carte d\'identité de l\'organisation', null],
                'professional_card' => ['Carte professionnelle', 'Ordre des médecins, Barreau, Conseil de l\'Ordre, etc.'],
                'family_record_book' => ['Livret de famille', 'Si vous êtes marié·e ou avez des enfants'],
                'diplomatic_passport' => ['Passeport diplomatique ou de service', null],
                'residence_permit_renewal_receipt' => ['Récépissé de renouvellement de titre de séjour', 'Si le titre est expiré mais que le renouvellement est en cours'],
                'visa_or_residence_permit' => ['Visa ou titre de séjour', 'En cours de validité et avec justificatif de renouvellement si applicable'],
            ],
            DocumentCategory::Other->value => [
                'information_sheet' => ['Fiche de renseignements', null],
                'presentation_letter' => ['Lettre de présentation personnalisée', 'Lettre accompagnée d\'une photo afin de vous présenter, partager votre projet à Paris et donner un côté humain à votre dossier'],
                'relocation_certificate' => ['Attestation de relocation', 'Si l\'organisation prend en charge une partie du loyer ou les frais d\'agence, une lettre des RH confirmant le « Relocation Package »'],
            ],
            DocumentCategory::Work->value => [
                'payslips' => ['3 derniers bulletins de salaire', null],
                'stock_grant_certificate' => ['Attestation d\'attribution d\'actions', 'Pour prouver les revenus différés (RSU, stock-options ou autre)'],
                'position_certificate' => ['Attestation de fonction', 'Lettre officielle de l\'Ambassade ou de l\'organisation internationale confirmant le poste, la date de prise de fonction et la durée prévue de la mission en France'],
                'accountant_certificate' => ['Attestation de l\'expert-comptable', 'Un document d\'une page qui résume les revenus nets de l\'année en cours et atteste de la bonne santé de l\'activité'],
                'employer_certificate' => ['Attestation employeur', 'Elle doit stipuler : date d\'embauche, type de contrat, rémunération brute/nette, et surtout la mention « ni en période d\'essai, ni en procédure de licenciement ou de démission »'],
                'urssaf_certificate' => ['Attestation URSSAF', 'Document prouvant que vous êtes à jour de vos cotisations'],
                'sirene_notice' => ['Avis de situation au répertoire SIRENE', 'Avis de l\'INSEE ou d\'un organisme équivalent concernant le statut d\'inscription au registre'],
                'employment_contract' => ['Contrat de travail', 'Complet et signé'],
                'apprenticeship_contract' => ['Contrat d\'apprentissage', 'Ou de professionnalisation'],
                'pension_title' => ['Dernier titre de pension', 'Ou attestation de droit à la retraite'],
                'kbis' => ['Extrait Kbis', 'Certificat d\'enregistrement de la société datant de moins de 3 mois'],
                'professional_registration' => ['Justificatif d\'inscription', 'À l\'Ordre ou au registre de votre profession'],
                'bonus_letter' => ['Lettre de bonus', 'Justificatif du variable ou des bonus des 12 derniers mois'],
                'transfer_letter' => ['Lettre de mutation', 'Attestation employeur explicitant la raison de la mutation à Paris'],
                'retirement_notice' => ['Notification de départ à la retraite', 'Si passage en retraite récent'],
                'company_statutes' => ['Statuts de la société', 'Seulement les pages indiquant la nomination du gérant et la répartition du capital'],
            ],
        ];
    }
}
