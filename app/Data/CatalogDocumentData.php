<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\DocumentCategory;

/**
 * Données validées d'une pièce du catalogue (création ou modification).
 */
final readonly class CatalogDocumentData
{
    public function __construct(
        public DocumentCategory $category,
        public string $label,
        public ?string $labelEn,
        public ?string $hint,
        public ?string $hintEn,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): self
    {
        return new self(
            category: DocumentCategory::from((string) $data['category']),
            label: trim((string) $data['label']),
            labelEn: self::blankToNull($data['label_en'] ?? null),
            hint: self::blankToNull($data['hint'] ?? null),
            hintEn: self::blankToNull($data['hint_en'] ?? null),
        );
    }

    /**
     * @return array{category: string, label: string, label_en: string|null, hint: string|null, hint_en: string|null}
     */
    public function toArray(): array
    {
        return [
            'category' => $this->category->value,
            'label' => $this->label,
            'label_en' => $this->labelEn,
            'hint' => $this->hint,
            'hint_en' => $this->hintEn,
        ];
    }

    private static function blankToNull(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
