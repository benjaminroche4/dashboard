<?php

declare(strict_types=1);

use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Str;

test('un devis reçoit un uuid à sa création', function (): void {
    $quote = Quote::factory()->create();

    expect($quote->uuid)->not->toBeNull()
        ->and(Str::isUuid($quote->uuid))->toBeTrue()
        ->and(Quote::factory()->create()->uuid)->not->toBe($quote->uuid);
});

test('quote routes use the UUID and refuse the numeric id', function (): void {
    $staff = User::factory()->staff()->create();
    $quote = Quote::factory()->create();

    expect(route('tools.quotes.show', $quote))->toEndWith('/tools/quotes/'.$quote->uuid)
        ->and(route('tools.quotes.show', $quote))->not->toContain('/tools/quotes/'.$quote->id)
        ->and(route('tools.quotes.pdf', $quote))->toContain('/tools/quotes/'.$quote->uuid.'/pdf');

    $this->actingAs($staff)->get('/tools/quotes/'.$quote->uuid)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('quotes/show')
            ->where('quote.id', $quote->id)
            ->where('quote.uuid', $quote->uuid));

    $this->actingAs($staff)->get('/tools/quotes/'.$quote->id)->assertNotFound();
    $this->actingAs($staff)->get('/tools/quotes/'.Str::uuid())->assertNotFound();
});

test("la fiche d'un lead expose l'uuid de ses devis", function (): void {
    $staff = User::factory()->staff()->create();
    $quote = Quote::factory()->create(['lead_id' => Lead::factory()->create()->id]);

    $this->actingAs($staff)->get(route('leads.show', $quote->lead))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('leads/show')
            ->where('quotes.0.uuid', $quote->uuid));
});
