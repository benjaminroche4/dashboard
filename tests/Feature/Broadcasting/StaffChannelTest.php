<?php

use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('guests cannot join the staff channel', function (): void {
    $this->post('/broadcasting/auth', [
        'channel_name' => 'presence-staff',
        'socket_id' => '1234.5678',
    ])->assertForbidden();
});

test('authenticated staff can join the staff channel with their identity', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/broadcasting/auth', [
            'channel_name' => 'presence-staff',
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertJsonPath('channel_data', fn (string $data): bool => json_decode($data, true)['user_info'] === [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => null,
        ]);
});

test('dashboard updates can be dispatched', function (): void {

    event(new DashboardUpdated('orders', ['id' => 1]));

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $e): bool => $e->resource === 'orders');
});
