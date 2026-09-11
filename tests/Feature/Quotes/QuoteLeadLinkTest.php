<?php

declare(strict_types=1);

use App\Enums\LeadStatus;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('a manager links a quote to a lead, then to a client, then detaches it', function (): void {
    $manager = User::factory()->create(['role' => 'manager']);
    $quote = Quote::factory()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand']);

    $this->actingAs($manager)
        ->patch(route('tools.quotes.link', $quote), ['lead_id' => $lead->id])
        ->assertSessionHasNoErrors();

    expect($quote->refresh()->lead_id)->toBe($lead->id)
        ->and($lead->notes()->latest('id')->value('body'))->toContain("Devis {$quote->number} rattaché");

    // Un lead converti est un dossier client : la fiche le dit et pointe vers le dossier.
    $client = Lead::factory()->converted()->create();
    $this->actingAs($manager)
        ->patch(route('tools.quotes.link', $quote), ['lead_id' => $client->id])
        ->assertSessionHasNoErrors();

    $this->actingAs($manager)
        ->get(route('tools.quotes.show', $quote))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('quote.lead.name', $client->fullName())
            ->where('quote.lead.is_client', true));

    $this->actingAs($manager)
        ->patch(route('tools.quotes.link', $quote), ['lead_id' => null])
        ->assertSessionHasNoErrors();

    expect($quote->refresh()->lead_id)->toBeNull()
        ->and($client->notes()->latest('id')->value('body'))->toContain("Devis {$quote->number} détaché");
});

test('the linked lead of an invoice says whether it is a client', function (): void {
    $lead = Lead::factory()->create(['status' => LeadStatus::InProgress]);
    $invoice = Invoice::factory()->create(['lead_id' => $lead->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('invoices.show', $invoice))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoice.lead.is_client', false));
});

test('a member cannot link a quote to a lead', function (): void {
    $quote = Quote::factory()->create();
    $lead = Lead::factory()->create();
    $member = User::factory()->create(['role' => 'member']);

    $this->actingAs($member)
        ->patch(route('tools.quotes.link', $quote), ['lead_id' => $lead->id])
        ->assertForbidden();
});
