<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DocumentUploadStatus;
use App\Enums\EmploymentStatus;
use App\Enums\ResidencyStatus;
use App\Support\JsonSchema;

/**
 * Ce que l'assistant a lu dans une pièce déposée : la nature du document, s'il
 * répond à ce qui était demandé, un verdict motivé, et les informations utiles
 * à la fiche du locataire. Une proposition, jamais une décision : l'équipe
 * relit avant que quoi que ce soit ne s'écrive sur la pièce ou sur la fiche.
 */
final readonly class DocumentAnalysisData
{
    /** Longueur maximale du motif, lisible d'un coup d'œil sous la pièce. */
    public const int REASON_LENGTH = 300;

    /**
     * @param  array<string, mixed>  $profile  Champs de `TenantProfileData` lus sur le document
     */
    public function __construct(
        public string $documentType,
        public bool $matchesRequest,
        public DocumentUploadStatus $verdict,
        public string $reason,
        public ?string $holderName,
        public ?string $documentDate,
        public ?string $expiresAt,
        public array $profile,
    ) {}

    /**
     * Schéma JSON attendu de l'assistant : sans `minimum`, `maxLength` ni
     * `format`, que l'API refuse — les bornes se disent dans les descriptions
     * et se vérifient dans `from()`.
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['document_type', 'matches_request', 'verdict', 'reason', 'holder_name', 'document_date', 'expires_at', 'profile'],
            'properties' => [
                'document_type' => ['type' => 'string', 'description' => 'Nature du document tel qu’il est réellement (« Bulletin de salaire de juin 2026 », « Passeport français »…), en français.'],
                'matches_request' => ['type' => 'boolean', 'description' => 'Vrai si le document est bien la pièce demandée, pour la bonne personne.'],
                'verdict' => ['type' => 'string', 'enum' => [DocumentUploadStatus::Accepted->value, DocumentUploadStatus::Refused->value], 'description' => 'Recevable tel quel pour un dossier de location en France, ou à redéposer.'],
                'reason' => ['type' => 'string', 'description' => 'Une ou deux phrases en français, 300 caractères au plus. Sur un refus, dire précisément quoi redéposer : le client lira ce motif.'],
                'holder_name' => JsonSchema::nullable('string', ['description' => 'Nom de la personne figurant sur le document, tel qu’écrit.']),
                'document_date' => JsonSchema::nullable('string', ['description' => 'Date du document au format AAAA-MM-JJ (période d’un bulletin, date d’émission), null si absente.']),
                'expires_at' => JsonSchema::nullable('string', ['description' => 'Date d’expiration au format AAAA-MM-JJ pour une pièce d’identité ou un titre de séjour, null sinon.']),
                'profile' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'description' => 'Informations lues sur le document pour la fiche du locataire. Un champ non lisible reste null : ne jamais deviner.',
                    'required' => ['birth_date', 'nationality', 'birth_place', 'residency_status', 'residency_number', 'residency_expires_at', 'employment_status', 'employer', 'monthly_net_income'],
                    'properties' => [
                        'birth_date' => JsonSchema::nullable('string', ['description' => 'AAAA-MM-JJ']),
                        'nationality' => JsonSchema::nullable('string', ['description' => 'Nationalité en français (« Française », « Italienne »).']),
                        'birth_place' => JsonSchema::nullable('string'),
                        'residency_status' => JsonSchema::nullableEnum(JsonSchema::values(ResidencyStatus::class), 'Statut de séjour déduit d’une pièce d’identité ou d’un titre : citoyen de l’UE, visa long séjour, titre de séjour, passeport talent, visa étudiant, autre.'),
                        'residency_number' => JsonSchema::nullable('string', ['description' => 'Numéro du titre de séjour ou du visa.']),
                        'residency_expires_at' => JsonSchema::nullable('string', ['description' => 'AAAA-MM-JJ']),
                        'employment_status' => JsonSchema::nullableEnum(JsonSchema::values(EmploymentStatus::class), 'Situation professionnelle déduite d’un contrat ou d’un bulletin : CDI, CDD, indépendant, étudiant, stage ou alternance, retraité, sans emploi, autre.'),
                        'employer' => JsonSchema::nullable('string', ['description' => 'Nom de l’employeur ou de l’école.']),
                        'monthly_net_income' => JsonSchema::nullable('number', ['description' => 'Revenu net mensuel en euros lu sur un bulletin de salaire ou un avis d’imposition (revenu annuel divisé par douze), null sinon.']),
                    ],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        $verdict = DocumentUploadStatus::tryFrom((string) ($data['verdict'] ?? '')) ?? DocumentUploadStatus::Refused;
        $profile = is_array($data['profile'] ?? null) ? $data['profile'] : [];
        $income = $profile['monthly_net_income'] ?? null;

        return new self(
            documentType: self::text($data['document_type'] ?? null) ?? 'Document',
            matchesRequest: (bool) ($data['matches_request'] ?? false),
            // Un document qui n'est pas la pièce demandée n'est jamais recevable.
            verdict: $verdict === DocumentUploadStatus::Accepted && ! (bool) ($data['matches_request'] ?? false) ? DocumentUploadStatus::Refused : $verdict,
            reason: mb_substr(self::text($data['reason'] ?? null) ?? '', 0, self::REASON_LENGTH),
            holderName: self::text($data['holder_name'] ?? null),
            documentDate: self::date($data['document_date'] ?? null),
            expiresAt: self::date($data['expires_at'] ?? null),
            profile: array_filter([
                'birth_date' => self::date($profile['birth_date'] ?? null),
                'nationality' => self::text($profile['nationality'] ?? null),
                'birth_place' => self::text($profile['birth_place'] ?? null),
                'residency_status' => ResidencyStatus::tryFrom((string) ($profile['residency_status'] ?? ''))?->value,
                'residency_number' => self::text($profile['residency_number'] ?? null),
                'residency_expires_at' => self::date($profile['residency_expires_at'] ?? null),
                'employment_status' => EmploymentStatus::tryFrom((string) ($profile['employment_status'] ?? ''))?->value,
                'employer' => self::text($profile['employer'] ?? null),
                // Le formulaire de la fiche saisit des euros : on garde la même unité.
                'income' => is_numeric($income) && (float) $income > 0 ? round((float) $income, 2) : null,
            ], fn (mixed $value): bool => $value !== null),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'document_type' => $this->documentType,
            'matches_request' => $this->matchesRequest,
            'verdict' => $this->verdict->value,
            'reason' => $this->reason,
            'holder_name' => $this->holderName,
            'document_date' => $this->documentDate,
            'expires_at' => $this->expiresAt,
            'profile' => $this->profile,
        ];
    }

    /** Vrai si l'assistant a lu quelque chose d'utile pour la fiche du locataire. */
    public function hasProfile(): bool
    {
        return $this->profile !== [];
    }

    private static function text(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }

    /** Une date AAAA-MM-JJ valide, sinon null : l'assistant ne fixe pas de date approximative. */
    private static function date(mixed $value): ?string
    {
        $text = self::text($value);

        if ($text === null || preg_match('/^\d{4}-\d{2}-\d{2}$/', $text) !== 1) {
            return null;
        }

        [$year, $month, $day] = array_map(intval(...), explode('-', $text));

        return checkdate($month, $day, $year) ? $text : null;
    }
}
