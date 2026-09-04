<?php

declare(strict_types=1);

use App\Events\DashboardUpdated;
use App\Models\User;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

uses(TestCase::class);

test('it broadcasts on the staff presence channel', function (): void {
    $event = new DashboardUpdated('orders');

    expect($event->broadcastOn())->toHaveCount(1)
        ->and($event->broadcastOn()[0])->toBeInstanceOf(PresenceChannel::class)
        ->and((string) $event->broadcastOn()[0]->name)->toBe('presence-staff');
});

test('it uses a stable event name', function (): void {
    expect((new DashboardUpdated('orders'))->broadcastAs())->toBe('dashboard.updated');
});

test('it serialises the resource, payload, message and actor', function (): void {
    $actor = new User(['name' => 'Admin 2', 'email' => 'admin2@admin.fr']);
    $actor->id = 7;

    $data = (new DashboardUpdated('orders', ['id' => 42], 'a expédié la commande #42', $actor))->broadcastWith();

    expect($data)->toHaveKeys(['resource', 'payload', 'message', 'actor', 'at'])
        ->and($data['resource'])->toBe('orders')
        ->and($data['payload'])->toBe(['id' => 42])
        ->and($data['message'])->toBe('a expédié la commande #42')
        ->and($data['actor'])->toBe(['id' => 7, 'name' => 'Admin 2']);
});

test('it falls back to a generic message and the authenticated actor', function (): void {
    $user = new User(['name' => 'Admin', 'email' => 'admin@admin.fr']);
    $user->id = 1;
    Auth::shouldReceive('user')->once()->andReturn($user);

    $data = (new DashboardUpdated('orders'))->broadcastWith();

    expect($data['message'])->toBe('a modifié orders')
        ->and($data['actor'])->toBe(['id' => 1, 'name' => 'Admin']);
});

test('it has no actor when nobody is authenticated', function (): void {
    Auth::shouldReceive('user')->once()->andReturn(null);

    expect((new DashboardUpdated('orders'))->broadcastWith()['actor'])->toBeNull();
});
