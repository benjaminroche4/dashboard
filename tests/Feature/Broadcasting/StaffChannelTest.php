<?php

use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('guests cannot join the staff channel', function () {
    $this->post('/broadcasting/auth', [
        'channel_name' => 'presence-staff',
        'socket_id' => '1234.5678',
    ])->assertForbidden();
});

test('authenticated staff can join the staff channel with their identity', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-staff',
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertJsonPath('channel_data', fn (string $data) => json_decode($data, true)['user_info'] === [
            'id' => $user->id,
            'name' => $user->name,
        ]);
});

test('dashboard updates can be dispatched', function () {

    DashboardUpdated::dispatch('orders', ['id' => 1]);

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $e) => $e->resource === 'orders');
});
