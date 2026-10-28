<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Remplace la photo d'un agent sur le disque public, et efface l'ancienne.
 */
final class UpdateAgentPhoto
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'agent-photos';

    public function handle(Agent $agent, UploadedFile $photo, ?User $by = null): Agent
    {
        $previous = $agent->photo_path;

        $path = $photo->store(self::DIRECTORY, self::DISK);

        throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer la photo.');

        $agent->forceFill(['photo_path' => $path])->save();

        if ($previous !== null && $previous !== $path) {
            Storage::disk(self::DISK)->delete($previous);
        }

        event(new DashboardUpdated('agents', ['id' => $agent->id], "a changé la photo de l'agent {$agent->fullName()}", $by));

        return $agent;
    }
}
