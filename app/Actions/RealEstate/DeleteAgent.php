<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agent;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime un agent immobilier, et sa photo du disque.
 */
final class DeleteAgent
{
    public function handle(Agent $agent): void
    {
        $id = $agent->id;
        $name = $agent->fullName();
        $photo = $agent->photo_path;

        $agent->delete();

        if ($photo !== null) {
            Storage::disk(UpdateAgentPhoto::DISK)->delete($photo);
        }

        event(new DashboardUpdated('agents', ['id' => $id, 'deleted' => true], "a supprimé l'agent {$name}"));
    }
}
