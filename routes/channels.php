<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', fn (User $user, int $id): bool => $user->id === $id);

// Canal de présence partagé par tout le staff : chaque action du backoffice
// y est diffusée pour que les autres membres connectés la voient sans refresh.
Broadcast::channel('staff', fn (User $user): array => ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar]);
