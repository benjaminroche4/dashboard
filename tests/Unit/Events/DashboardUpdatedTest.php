<?php

use App\Events\DashboardUpdated;
use Illuminate\Broadcasting\PresenceChannel;

test('it broadcasts on the staff presence channel', function (): void {
    $event = new DashboardUpdated('orders');

    expect($event->broadcastOn())->toHaveCount(1)
        ->and($event->broadcastOn()[0])->toBeInstanceOf(PresenceChannel::class)
        ->and((string) $event->broadcastOn()[0]->name)->toBe('presence-staff');
});

test('it uses a stable event name', function (): void {
    expect((new DashboardUpdated('orders'))->broadcastAs())->toBe('dashboard.updated');
});

test('it serialises the resource and payload', function (): void {
    $data = (new DashboardUpdated('orders', ['id' => 42]))->broadcastWith();

    expect($data)->toHaveKeys(['resource', 'payload', 'at'])
        ->and($data['resource'])->toBe('orders')
        ->and($data['payload'])->toBe(['id' => 42]);
});
