<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Data\PropertyData;
use App\Events\DashboardUpdated;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Ajoute un bien à l'annuaire « Biens », photos enregistrées sur le disque public.
 */
final readonly class CreateProperty
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'properties';

    public function __construct(private GeocodeProperty $geocode) {}

    public function handle(PropertyData $data, ?User $by = null): Property
    {
        $photos = array_map(function (UploadedFile $photo): string {
            $path = $photo->store(self::DIRECTORY, self::DISK);
            throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer la photo du bien.');

            return $path;
        }, $data->photos);

        $property = Property::query()->create([...$data->toArray(), 'photos' => $photos, 'created_by' => $by?->id]);
        $this->geocode->handle($property);

        event(new DashboardUpdated('properties', ['id' => $property->id], "a ajouté le bien {$property->label()}", $by));

        return $property;
    }
}
