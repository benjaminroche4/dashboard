<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DocumentCategory;
use App\Models\CatalogDocument;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CatalogDocument>
 */
class CatalogDocumentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $label = rtrim(fake()->unique()->sentence(3), '.');

        return [
            'key' => Str::slug($label, '_'),
            'category' => fake()->randomElement(DocumentCategory::cases()),
            'label' => $label,
            'label_en' => rtrim(fake()->sentence(3), '.'),
            'hint' => fake()->boolean() ? fake()->sentence(6) : null,
            'hint_en' => null,
            'position' => fake()->numberBetween(100, 200),
        ];
    }

    public function category(DocumentCategory $category): static
    {
        return $this->state(fn (): array => ['category' => $category]);
    }
}
