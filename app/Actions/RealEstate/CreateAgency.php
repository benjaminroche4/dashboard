<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Actions\Directory\GeocodeDirectoryEntry;
use App\Actions\Directory\SendDirectoryWelcome;
use App\Data\AgencyData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;

/**
 * Enregistre une agence immobilière partenaire et, sur demande, la prévient par e-mail.
 */
final readonly class CreateAgency
{
    public function __construct(
        private SendDirectoryWelcome $welcome = new SendDirectoryWelcome,
        private ?GeocodeDirectoryEntry $geocode = null,
    ) {}

    public function handle(AgencyData $data, ?User $by = null, bool $notify = false): Agency
    {
        $agency = Agency::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        // Position pour la carte : sans clé ni adresse, l'entrée reste sans position.
        ($this->geocode ?? resolve(GeocodeDirectoryEntry::class))->handle($agency);

        if ($notify && $agency->email !== null) {
            $this->welcome->handle($agency->email, $agency->name, 'agence immobilière partenaire', $agency->phone, $by);
        }

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a ajouté l'agence {$agency->name}"));

        return $agency;
    }
}
