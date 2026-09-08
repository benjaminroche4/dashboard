<?php

declare(strict_types=1);

namespace App\Actions\Properties;

use App\Events\DashboardUpdated;
use App\Models\Property;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime un bien, ses photos sur le disque et les visites qui lui étaient rattachées.
 */
final class DeleteProperty
{
    public function handle(Property $property): void
    {
        $id = $property->id;
        $label = $property->label();

        $photos = $property->photos ?? [];

        $property->delete();

        if ($photos !== []) {
            Storage::disk(CreateProperty::DISK)->delete($photos);
        }

        event(new DashboardUpdated('properties', ['id' => $id, 'deleted' => true], "a supprimé le bien {$label}"));
    }
}
