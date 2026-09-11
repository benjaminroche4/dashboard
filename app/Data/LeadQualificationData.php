<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\PropertyType;
use App\Models\Lead;
use App\Support\JsonSchema;
use Carbon\CarbonImmutable;

/**
 * Qualification proposée par l'assistant IA à partir de ce que le lead a
 * écrit ou dit en arrivant. Stockée telle quelle sur `leads.ai_qualification`
 * jusqu'à ce que l'équipe l'applique ou l'ignore.
 */
final readonly class LeadQualificationData
{
    /** Champs du lead que l'assistant peut proposer, dans l'ordre d'affichage. */
    public const array FIELDS = ['company', 'language', 'budget_cents', 'arrival_at', 'districts', 'property_types', 'furnished', 'duration', 'guarantors', 'origin_city', 'score'];

    /**
     * @param  list<int>  $districts
     * @param  list<PropertyType>  $propertyTypes
     * @param  list<GuarantorType>  $guarantors
     */
    public function __construct(
        public string $summary,
        public ?string $company,
        public ?LeadLanguage $language,
        public ?int $budgetCents,
        public Currency $currency,
        public ?CarbonImmutable $arrivalAt,
        public array $districts,
        public array $propertyTypes,
        public ?Furnished $furnished,
        public ?LeadDuration $duration,
        public array $guarantors,
        public ?string $originCity,
        public ?int $score,
        public ?string $scoreReason,
    ) {}

    /**
     * Schéma JSON demandé à l'assistant.
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        $nullable = JsonSchema::nullable(...);
        $values = JsonSchema::values(...);

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['summary', 'company', 'language', 'budget', 'currency', 'arrival_at', 'districts', 'property_types', 'furnished', 'duration', 'guarantors', 'origin_city', 'score', 'score_reason'],
            'properties' => [
                'summary' => ['type' => 'string', 'description' => 'Le projet en une ou deux phrases, en français, factuel'],
                'company' => $nullable('string', ['description' => 'Employeur ou société qui finance, si cité']),
                'language' => JsonSchema::nullableEnum($values(LeadLanguage::class), 'Langue dans laquelle le lead écrit ou parle'),
                'budget' => $nullable('number', ['description' => 'Budget mensuel maximal en unités de la devise']),
                'currency' => ['type' => 'string', 'enum' => $values(Currency::class)],
                'arrival_at' => $nullable('string', ['description' => 'Date d’emménagement souhaitée, AAAA-MM-JJ (1er du mois si seul le mois est connu)']),
                // Bornes 1 à 20 dites dans la description : l'API refuse `minimum` / `maximum`.
                'districts' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => 'Arrondissements de Paris (1 à 20) cités ou déduits des quartiers (Marais → 3 et 4, Oberkampf → 11…)'],
                'property_types' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => $values(PropertyType::class)]],
                'furnished' => JsonSchema::nullableEnum($values(Furnished::class)),
                'duration' => JsonSchema::nullableEnum($values(LeadDuration::class), 'short = 1 à 3 mois, medium = 3 à 12 mois, long = 12 mois et plus'),
                'guarantors' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => $values(GuarantorType::class)], 'description' => 'physique = un proche, garantme = garant institutionnel, bancaire = caution bancaire'],
                'origin_city' => $nullable('string', ['description' => 'Ville ou pays de départ']),
                'score' => $nullable('integer', ['description' => 'Qualité du lead, de 1 à 5 : 5 = projet clair, budget réaliste, date proche ; 1 = vague ou hors cible']),
                'score_reason' => $nullable('string', ['description' => 'Motif de la note en une phrase, en français']),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data  Réponse de l'assistant, ou JSON stocké (`toArray()`)
     */
    public static function from(array $data): self
    {
        $budget = $data['budget_cents'] ?? null;
        if ($budget === null && isset($data['budget']) && is_numeric($data['budget'])) {
            $budget = (int) round((float) $data['budget'] * 100);
        }
        $arrival = null;
        if (is_string($data['arrival_at'] ?? null) && $data['arrival_at'] !== '') {
            try {
                $arrival = CarbonImmutable::parse($data['arrival_at'])->startOfDay();
            } catch (\Throwable) {
                $arrival = null;
            }
        }
        $score = isset($data['score']) && is_numeric($data['score']) ? (int) $data['score'] : null;

        return new self(
            summary: trim((string) ($data['summary'] ?? '')),
            company: self::string($data['company'] ?? null),
            language: LeadLanguage::tryFrom((string) ($data['language'] ?? '')),
            budgetCents: is_int($budget) && $budget > 0 ? $budget : null,
            currency: Currency::tryFrom((string) ($data['currency'] ?? '')) ?? Currency::EUR,
            arrivalAt: $arrival,
            districts: array_values(array_unique(array_filter(array_map(intval(...), (array) ($data['districts'] ?? [])), fn (int $district): bool => $district >= 1 && $district <= 20))),
            propertyTypes: array_values(array_filter(array_map(fn (mixed $type): ?PropertyType => PropertyType::tryFrom((string) $type), (array) ($data['property_types'] ?? [])))),
            furnished: Furnished::tryFrom((string) ($data['furnished'] ?? '')),
            duration: LeadDuration::tryFrom((string) ($data['duration'] ?? '')),
            guarantors: array_values(array_filter(array_map(fn (mixed $type): ?GuarantorType => GuarantorType::tryFrom((string) $type), (array) ($data['guarantors'] ?? [])))),
            originCity: self::string($data['origin_city'] ?? null),
            score: $score !== null && $score >= 1 && $score <= 5 ? $score : null,
            scoreReason: self::string($data['score_reason'] ?? null),
        );
    }

    /**
     * Forme stockée en base (JSON).
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'summary' => $this->summary,
            'company' => $this->company,
            'language' => $this->language?->value,
            'budget_cents' => $this->budgetCents,
            'currency' => $this->currency->value,
            'arrival_at' => $this->arrivalAt?->toDateString(),
            'districts' => $this->districts,
            'property_types' => array_map(fn (PropertyType $type): string => $type->value, $this->propertyTypes),
            'furnished' => $this->furnished?->value,
            'duration' => $this->duration?->value,
            'guarantors' => array_map(fn (GuarantorType $type): string => $type->value, $this->guarantors),
            'origin_city' => $this->originCity,
            'score' => $this->score,
            'score_reason' => $this->scoreReason,
        ];
    }

    /**
     * Propositions à relire : seulement les champs que l'assistant a lus et
     * que le lead n'a pas encore. Chaque entrée : clé, libellé, valeur affichée.
     *
     * @return list<array{key: string, label: string, value: string}>
     */
    public function proposals(Lead $lead): array
    {
        $rows = [];
        $add = function (string $key, string $label, mixed $proposed, bool $empty, string $display) use (&$rows): void {
            if ($proposed !== null && $proposed !== [] && $empty) {
                $rows[] = ['key' => $key, 'label' => $label, 'value' => $display];
            }
        };

        $add('company', 'Société', $this->company, $lead->company === null || $lead->company === '', (string) $this->company);
        // La langue a toujours une valeur par défaut (français) : on ne propose que l'anglais détecté.
        $add('language', 'Langue', $this->language, $lead->language === LeadLanguage::French && $this->language === LeadLanguage::English, $this->language?->label() ?? '');
        $add('budget_cents', 'Budget mensuel', $this->budgetCents, $lead->budget_cents === null, $this->budgetCents === null ? '' : number_format($this->budgetCents / 100, 0, ',', ' ').' '.$this->currency->value);
        $add('arrival_at', 'Emménagement', $this->arrivalAt, $lead->arrival_at === null, $this->arrivalAt?->translatedFormat('j F Y') ?? '');
        $add('districts', 'Arrondissements', $this->districts, ($lead->districts ?? []) === [], implode(', ', array_map(fn (int $district): string => $district === 1 ? '1er' : "{$district}e", $this->districts)));
        $add('property_types', 'Type de bien', $this->propertyTypes, $lead->property_types === null || $lead->property_types->isEmpty(), implode(', ', array_map(fn (PropertyType $type): string => $type->label(), $this->propertyTypes)));
        $add('furnished', 'Meublé', $this->furnished, $lead->furnished === null, $this->furnished?->label() ?? '');
        $add('duration', 'Durée', $this->duration, $lead->duration === null, $this->duration?->label() ?? '');
        $add('guarantors', 'Garants', $this->guarantors, $lead->guarantors === null || $lead->guarantors->isEmpty(), implode(', ', array_map(fn (GuarantorType $type): string => $type->label(), $this->guarantors)));
        $add('origin_city', 'Ville d’origine', $this->originCity, $lead->origin_city === null || $lead->origin_city === '', (string) $this->originCity);
        $add('score', 'Note', $this->score, $lead->score === null, $this->score === null ? '' : "{$this->score} / 5".($this->scoreReason !== null ? " · {$this->scoreReason}" : ''));

        return $rows;
    }

    /**
     * Valeurs à écrire sur le lead pour les clés retenues (colonnes Eloquent).
     *
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    public function attributes(array $keys): array
    {
        $all = [
            'company' => $this->company,
            'language' => $this->language,
            'budget_cents' => $this->budgetCents,
            'currency' => $this->budgetCents === null ? null : $this->currency,
            'arrival_at' => $this->arrivalAt,
            'districts' => $this->districts,
            'property_types' => $this->propertyTypes,
            'furnished' => $this->furnished,
            'duration' => $this->duration,
            'guarantors' => $this->guarantors,
            'origin_city' => $this->originCity,
            'score' => $this->score,
        ];
        $attributes = [];

        foreach ($keys as $key) {
            if (array_key_exists($key, $all) && $all[$key] !== null && $all[$key] !== []) {
                $attributes[$key] = $all[$key];
            }
        }

        if (isset($attributes['budget_cents'])) {
            $attributes['currency'] = $this->currency;
        }

        return $attributes;
    }

    private static function string(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
