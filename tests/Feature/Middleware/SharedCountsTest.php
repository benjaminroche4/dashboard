<?php

declare(strict_types=1);

use App\Enums\DocumentUploadStatus;
use App\Enums\LeadStatus;
use App\Models\DocumentUpload;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\User;
use App\Models\Visit;
use Inertia\Testing\AssertableInertia;

test('the menu receives the number of leads still to handle', function (): void {
    Lead::factory()->count(2)->status(LeadStatus::Todo)->create();
    Lead::factory()->rentalManagement()->create();
    Lead::factory()->rentalManagement()->status(LeadStatus::InProgress)->create();
    Lead::factory()->status(LeadStatus::InProgress)->create();
    Lead::factory()->converted()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            // Chaque badge compte son segment : les deux leads locataires à
            // traiter d'un côté, le lead propriétaire de l'autre.
            ->where('counts.leadsTodo', 2)
            ->where('counts.ownerLeadsTodo', 1));
});

test('the menu receives what awaits an action: reports to write, uploads to check, overdue invoices', function (): void {
    Visit::factory()->create(['scheduled_at' => now()->subDay(), 'report' => null]);
    Visit::factory()->create(['scheduled_at' => now()->addDay(), 'report' => null]);
    Visit::factory()->reported()->create(['scheduled_at' => now()->subDays(2)]);
    DocumentUpload::factory()->count(2)->create(['status' => DocumentUploadStatus::Pending]);
    DocumentUpload::factory()->create(['status' => DocumentUploadStatus::Accepted]);
    Invoice::factory()->overdue()->create();
    Invoice::factory()->paid()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('counts.visitReports', 1)
            ->where('counts.pendingUploads', 2)
            ->where('counts.overdueInvoices', 1));
});
