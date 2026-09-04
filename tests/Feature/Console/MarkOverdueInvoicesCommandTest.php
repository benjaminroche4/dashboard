<?php

declare(strict_types=1);

use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schedule;

test('invoices:mark-overdue flags late invoices and is scheduled nightly', function (): void {
    Event::fake([DashboardUpdated::class]);
    Invoice::factory()->create(['due_at' => now()->subWeek()]);

    $this->artisan('invoices:mark-overdue')
        ->expectsOutputToContain('1 facture(s) passée(s) en retard.')
        ->assertSuccessful();

    expect(Invoice::where('status', InvoiceStatus::Overdue)->count())->toBe(1);

    $scheduled = collect(Schedule::events())->map(fn ($event): string => $event->command ?? '');
    expect($scheduled->contains(fn (string $command): bool => str_contains($command, 'invoices:mark-overdue')))->toBeTrue();
});
