<?php

declare(strict_types=1);

use App\Actions\Activity\RecordActivity;
use App\Events\DashboardUpdated;
use App\Listeners\RecordActivity as RecordActivityListener;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('it records the actor, the resource, the message, the payload and the lead of a leads event', function (): void {
    Date::setTestNow('2026-09-08 10:00:00');
    $actor = User::factory()->create();
    $lead = Lead::factory()->create();

    $activity = (new RecordActivity)->handle(new DashboardUpdated('leads', ['id' => $lead->id, 'status' => 'todo'], 'a créé le lead', $actor));

    expect($activity)->toBeInstanceOf(Activity::class)
        ->and($activity->user_id)->toBe($actor->id)
        ->and($activity->lead_id)->toBe($lead->id)
        ->and($activity->resource)->toBe('leads')
        ->and($activity->message)->toBe('a créé le lead')
        ->and($activity->payload)->toBe(['id' => $lead->id, 'status' => 'todo'])
        ->and($activity->created_at->toDateTimeString())->toBe('2026-09-08 10:00:00')
        ->and($activity->actor?->is($actor))->toBeTrue()
        ->and($activity->lead?->is($lead))->toBeTrue();
});

test('it links the lead of a clients event and of a lead_id payload, never of another resource', function (): void {
    $lead = Lead::factory()->create();

    $client = (new RecordActivity)->handle(new DashboardUpdated('clients', ['id' => $lead->id], 'a rattaché un bien'));
    $visit = (new RecordActivity)->handle(new DashboardUpdated('visits', ['id' => 7, 'lead_id' => $lead->id], 'a planifié une visite'));
    $invoice = (new RecordActivity)->handle(new DashboardUpdated('invoices', ['id' => $lead->id], 'a créé la facture'));

    expect($client?->lead_id)->toBe($lead->id)
        ->and($visit?->lead_id)->toBe($lead->id)
        ->and($invoice?->lead_id)->toBeNull();
});

test('it skips events without message and ignores a lead that no longer exists', function (): void {
    $lead = Lead::factory()->create();
    $id = $lead->id;
    $lead->delete();

    $skipped = (new RecordActivity)->handle(new DashboardUpdated('leads', ['id' => $id]));
    $orphan = (new RecordActivity)->handle(new DashboardUpdated('leads', ['id' => $id], 'a supprimé le lead'));

    expect($skipped)->toBeNull()
        ->and($orphan?->lead_id)->toBeNull()
        ->and($orphan?->user_id)->toBeNull()
        ->and(Activity::query()->count())->toBe(1);
});

test('the listener reports a failure instead of breaking the original action', function (): void {
    Exceptions::fake();
    Schema::drop('activities');

    (new RecordActivityListener(new RecordActivity))->handle(new DashboardUpdated('leads', [], 'a créé le lead'));

    Exceptions::assertReported(fn (QueryException $exception): bool => str_contains($exception->getMessage(), 'activities'));
});
