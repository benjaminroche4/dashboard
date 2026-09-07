<?php

declare(strict_types=1);

use App\Actions\Partners\CreatePartner;
use App\Actions\Partners\DeletePartner;
use App\Actions\Partners\UpdatePartner;
use App\Data\PartnerData;
use App\Enums\PartnerType;
use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
});

test('the DTO casts the type and nullifies blanks', function (): void {
    $data = PartnerData::from(['name' => ' Zen ', 'type' => 'insurance', 'city' => '  ']);

    expect($data->type)->toBe(PartnerType::Insurance)
        ->and($data->toArray())->toMatchArray(['name' => 'Zen', 'city' => null]);
});

test('partner actions create, update and delete while broadcasting', function (): void {
    $by = User::factory()->create();

    $partner = resolve(CreatePartner::class)->handle(PartnerData::from(['name' => 'Zen', 'type' => 'bank']), $by);
    expect($partner->created_by)->toBe($by->id)
        ->and($partner->uuid)->not->toBeEmpty();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'partners' && str_contains((string) $event->message, 'Zen'));

    resolve(UpdatePartner::class)->handle($partner, PartnerData::from(['name' => 'Zen Nord', 'type' => 'bank']));
    expect($partner->refresh()->name)->toBe('Zen Nord');

    resolve(DeletePartner::class)->handle($partner);
    expect(Partner::query()->count())->toBe(0);
    Event::assertDispatched(DashboardUpdated::class, 3);
});
