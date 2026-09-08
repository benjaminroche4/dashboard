<?php

declare(strict_types=1);

namespace App\Http\Requests\Properties;

use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class StorePropertyRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return self::propertyRules();
    }

    /**
     * Règles d'un bien, réutilisées telles quelles (préfixées) par la planification d'une visite.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public static function propertyRules(string $prefix = ''): array
    {
        return [
            $prefix.'title' => ['nullable', 'string', 'max:255'],
            $prefix.'street' => ['required', 'string', 'max:255'],
            $prefix.'postal_code' => ['nullable', 'string', 'max:20'],
            $prefix.'city' => ['nullable', 'string', 'max:255'],
            $prefix.'district' => ['nullable', 'integer', 'min:1', 'max:20'],
            $prefix.'property_type' => ['nullable', Rule::enum(PropertyType::class)],
            $prefix.'furnished' => ['nullable', Rule::enum(Furnished::class)],
            $prefix.'rooms' => ['nullable', 'integer', 'min:1', 'max:30'],
            $prefix.'surface_m2' => ['nullable', 'integer', 'min:1', 'max:5000'],
            $prefix.'floor' => ['nullable', 'integer', 'min:-5', 'max:60'],
            $prefix.'lease_type' => ['nullable', Rule::enum(LeaseType::class)],
            $prefix.'rent_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            $prefix.'charges_cents' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            $prefix.'currency' => ['nullable', Rule::enum(Currency::class)],
            $prefix.'listing_url' => ['nullable', 'url:http,https', 'max:2048'],
            $prefix.'agent_id' => ['nullable', 'integer', Rule::exists('agents', 'id')],
            $prefix.'owner_id' => ['nullable', 'integer', Rule::exists('owners', 'id')],
            $prefix.'photos' => ['nullable', 'array', 'max:10'],
            $prefix.'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(5 * 1024)],
            $prefix.'notes' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return self::propertyAttributes();
    }

    /**
     * @return array<string, string>
     */
    public static function propertyAttributes(string $prefix = ''): array
    {
        return [
            $prefix.'title' => 'titre',
            $prefix.'street' => 'adresse',
            $prefix.'postal_code' => 'code postal',
            $prefix.'city' => 'ville',
            $prefix.'district' => 'arrondissement',
            $prefix.'property_type' => 'type de bien',
            $prefix.'furnished' => 'meublé',
            $prefix.'rooms' => 'pièces',
            $prefix.'surface_m2' => 'surface',
            $prefix.'floor' => 'étage',
            $prefix.'lease_type' => 'type de bail',
            $prefix.'rent_cents' => 'loyer',
            $prefix.'charges_cents' => 'charges',
            $prefix.'currency' => 'devise',
            $prefix.'listing_url' => 'lien de l’annonce',
            $prefix.'agent_id' => 'agent immobilier',
            $prefix.'owner_id' => 'propriétaire',
            $prefix.'photos' => 'photos',
            $prefix.'photos.*' => 'photo',
            $prefix.'notes' => 'notes',
        ];
    }
}
