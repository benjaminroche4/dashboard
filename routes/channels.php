<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return $user->id === $id;
});

// Canal de présence partagé par tout le staff : chaque action du backoffice
// y est diffusée pour que les autres membres connectés la voient sans refresh.
Broadcast::channel('staff', function (User $user) {
    return ['id' => $user->id, 'name' => $user->name];
});
