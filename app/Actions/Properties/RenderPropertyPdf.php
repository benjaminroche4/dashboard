<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Actions\Invoices\SendInvoice;
use App\Enums\Orientation;
use App\Enums\PropertyAmenity;
use App\Models\Property;
use App\Services\DocRaptor;
use Illuminate\Support\Facades\Storage;

/**
 * Fiche PDF d'un bien, à la charte des autres documents de l'équipe :
 * photos, caractéristiques, loyer, contacts et notes.
 */
final readonly class RenderPropertyPdf
{
    public function __construct(private DocRaptor $docRaptor) {}

    public function handle(Property $property): string
    {
        return $this->docRaptor->pdf($this->html($property), self::fileName($property));
    }

    public function isConfigured(): bool
    {
        return $this->docRaptor->isConfigured();
    }

    public function html(Property $property): string
    {
        $property->loadMissing(['agent.agency', 'owner']);

        return view('properties.pdf', [
            'property' => $property,
            'photos' => self::photos($property),
            'features' => self::features($property),
            'company' => config('company'),
            'logo' => SendInvoice::logoDataUri(),
        ])->render();
    }

    /**
     * Photos du bien encodées en data URI : DocRaptor ne peut pas lire une
     * URL locale, et les fichiers restent sur notre disque.
     *
     * @return list<string>
     */
    public static function photos(Property $property): array
    {
        $disk = Storage::disk(CreateProperty::DISK);
        $photos = [];

        foreach (array_slice($property->photos ?? [], 0, 6) as $path) {
            if (! $disk->exists($path)) {
                continue;
            }

            $photos[] = 'data:'.($disk->mimeType($path) ?: 'image/jpeg').';base64,'.base64_encode((string) $disk->get($path));
        }

        return $photos;
    }

    /**
     * Caractéristiques renseignées du bien, prêtes à imprimer.
     *
     * @return list<array{label: string, value: string}>
     */
    public static function features(Property $property): array
    {
        $rows = [
            ['label' => 'Type de bien', 'value' => $property->property_type?->label()],
            ['label' => 'Meublé', 'value' => $property->furnished?->label()],
            ['label' => 'Pièces', 'value' => $property->rooms === null ? null : (string) $property->rooms],
            ['label' => 'Chambres', 'value' => $property->bedrooms === null ? null : (string) $property->bedrooms],
            ['label' => 'Salles de bain', 'value' => $property->bathrooms === null ? null : (string) $property->bathrooms],
            ['label' => 'Surface', 'value' => $property->surface_m2 === null ? null : $property->surface_m2.' m²'],
            ['label' => 'Étage', 'value' => $property->floor?->label()],
            ['label' => "Étages de l'immeuble", 'value' => $property->building_floors === null ? null : (string) $property->building_floors],
            ['label' => 'Orientation', 'value' => self::labels(Orientation::class, $property->orientations)],
            ['label' => 'Type de bail', 'value' => $property->lease_type?->label()],
            ['label' => 'Équipements', 'value' => self::labels(PropertyAmenity::class, $property->amenities)],
            ['label' => 'Disponibilité', 'value' => $property->status->label()],
        ];

        return array_values(array_filter(
            array_map(fn (array $row): array => ['label' => $row['label'], 'value' => (string) $row['value']], $rows),
            fn (array $row): bool => $row['value'] !== '',
        ));
    }

    /**
     * Libellés d'une liste de valeurs d'enum, sur une ligne.
     *
     * @param  class-string<Orientation|PropertyAmenity>  $enum
     * @param  list<string>|null  $values
     */
    private static function labels(string $enum, ?array $values): ?string
    {
        $labels = array_map(fn (string $value): string => $enum::from($value)->label(), $values ?? []);

        return $labels === [] ? null : implode(', ', $labels);
    }

    public static function fileName(Property $property): string
    {
        $slug = str($property->label())->slug()->value();

        return 'bien-'.($slug !== '' ? $slug : $property->id).'.pdf';
    }
}
