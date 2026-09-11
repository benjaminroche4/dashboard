<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Data\PropertyData;
use App\Events\DashboardUpdated;
use App\Models\Property;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Modifie un bien de l'annuaire.
 */
final readonly class UpdateProperty
{
    public function __construct(private GeocodeProperty $geocode) {}

    public function handle(Property $property, PropertyData $data): Property
    {
        $photos = $this->photos($property, $data);

        $property->fill($data->toArray());
        $property->photos = $photos;
        $addressChanged = $property->isDirty(['street', 'postal_code', 'city']);
        $property->save();

        if ($addressChanged || $property->latitude === null) {
            $this->geocode->handle($property);
        }

        event(new DashboardUpdated('properties', ['id' => $property->id], "a modifié le bien {$property->label()}"));

        return $property;
    }

    /**
     * Photos du bien après modification : celles que le formulaire garde, plus
     * les nouvelles. Les photos retirées quittent aussi le disque.
     *
     * @return list<string>
     */
    private function photos(Property $property, PropertyData $data): array
    {
        $current = $property->photos ?? [];
        // Sans `kept_photos`, le formulaire ne touche pas aux photos existantes.
        $kept = $data->keptPhotos === null
            ? $current
            : array_values(array_intersect($current, $data->keptPhotos));

        $removed = array_values(array_diff($current, $kept));

        if ($removed !== []) {
            Storage::disk(CreateProperty::DISK)->delete($removed);
        }

        $added = array_map(function (UploadedFile $photo): string {
            $path = $photo->store(CreateProperty::DIRECTORY, CreateProperty::DISK);
            throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer la photo du bien.');

            return $path;
        }, $data->photos);

        return [...$kept, ...$added];
    }
}
