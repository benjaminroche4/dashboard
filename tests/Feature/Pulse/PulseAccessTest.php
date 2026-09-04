<?php

declare(strict_types=1);

use App\Models\User;

test('guests cannot open Pulse', function (): void {
    $this->get('/pulse')->assertForbidden();
});

test('members cannot open Pulse', function (): void {
    $this->actingAs(User::factory()->create())->get('/pulse')->assertForbidden();
});

test('admins can open Pulse', function (): void {
    $this->actingAs(User::factory()->admin()->create())->get('/pulse')->assertOk();
});
