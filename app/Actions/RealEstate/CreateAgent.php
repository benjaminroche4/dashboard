<?php

declare(strict_types=1);

namespace App\Actions\RealEstate;

use App\Actions\Directory\SendDirectoryWelcome;
use App\Data\AgentData;
use App\Events\DashboardUpdated;
use App\Models\Agent;
use App\Models\User;

/**
 * Enregistre un agent immobilier et, sur demande, le prévient par e-mail.
 */
final readonly class CreateAgent
{
    public function __construct(private SendDirectoryWelcome $welcome = new SendDirectoryWelcome) {}

    public function handle(AgentData $data, ?User $by = null, bool $notify = false): Agent
    {
        $agent = Agent::query()->create([...$data->toArray(), 'created_by' => $by?->id]);

        if ($notify && $agent->email !== null) {
            $this->welcome->handle($agent->email, $agent->fullName(), 'agent immobilier partenaire', $agent->phone, $by);
        }

        event(new DashboardUpdated('agents', ['id' => $agent->id], "a ajouté l'agent {$agent->fullName()}"));

        return $agent;
    }
}
