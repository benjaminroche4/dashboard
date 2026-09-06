<?php

declare(strict_types=1);

use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Exceptions;

test('an unreachable Reverb server does not break a creation', function (): void {
    Exceptions::fake();
    config()->set('broadcasting.default', 'reverb');
    config()->set('broadcasting.connections.reverb-raw.key', 'key');
    config()->set('broadcasting.connections.reverb-raw.secret', 'secret');
    config()->set('broadcasting.connections.reverb-raw.app_id', 'app');
    config()->set('broadcasting.connections.reverb-raw.options', ['host' => '127.0.0.1', 'port' => 9, 'scheme' => 'http', 'useTLS' => false]);
    config()->set('broadcasting.connections.reverb-raw.client_options', ['timeout' => 1, 'connect_timeout' => 1]);

    $this->actingAs(User::factory()->create())
        ->post(route('leads.store'), [
            'first_name' => 'Léa',
            'last_name' => 'Martin',
            'email' => 'lea@exemple.com',
            'language' => 'fr',
            'source' => 'website',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(Lead::query()->count())->toBe(1);
    Exceptions::assertReportedCount(1);
});
