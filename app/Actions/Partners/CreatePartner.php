<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Actions\Directory\SendDirectoryWelcome;
use App\Data\PartnerData;
use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;

/**
 * Enregistre un partenaire et, sur demande, le prévient par e-mail qu'il rejoint l'annuaire.
 */
final readonly class CreatePartner
{
    public function __construct(private SendDirectoryWelcome $welcome = new SendDirectoryWelcome) {}

    public function handle(PartnerData $data, ?User $by = null, bool $notify = false): Partner
    {
        $partner = Partner::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        if ($notify && $partner->email !== null) {
            $this->welcome->handle($partner->email, $partner->name, "partenaire · {$partner->type->label()}", $partner->phone, $by);
        }

        event(new DashboardUpdated('partners', ['id' => $partner->id], "a ajouté le partenaire {$partner->name}"));

        return $partner;
    }
}
