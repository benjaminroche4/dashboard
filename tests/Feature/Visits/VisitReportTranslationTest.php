<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Assistant\TranslateText;
use App\Enums\LeadLanguage;
use App\Mail\VisitReportSent;
use App\Models\Lead;
use App\Models\User;
use App\Models\Visit;
use App\Services\Assistant;
use Illuminate\Support\Facades\Mail;

/** Assistant simulé : renvoie une traduction, ou refuse de répondre. */
function fakeTranslator(?string $translation, bool $configured = true): Assistant
{
    return new class($translation, $configured) extends Assistant
    {
        public string $lastPrompt = '';

        public int $calls = 0;

        public function __construct(private readonly ?string $translation, private readonly bool $configured)
        {
            parent::__construct(key: $configured ? 'test-key' : null, model: 'claude-opus-5');
        }

        public function isConfigured(): bool
        {
            return $this->configured;
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->calls++;
            $this->lastPrompt = $prompt;

            throw_if($this->translation === null, RuntimeException::class, 'API indisponible');

            return ['translation' => $this->translation];
        }
    };
}

test('the report is translated into the language of the client before it is sent', function (): void {
    Mail::fake();
    $assistant = fakeTranslator('The client loved the light, the kitchen needs work.');
    app()->instance(Assistant::class, $assistant);

    $lead = Lead::factory()->converted()->create(['language' => LeadLanguage::English, 'email' => 'john@example.com']);
    $visit = Visit::factory()->create(['lead_id' => $lead->id, 'scheduled_at' => now()->subHour()]);

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Le client a adoré la lumière, la cuisine est à refaire.',
            'notify_client' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($assistant->calls)->toBe(1)
        ->and($assistant->lastPrompt)->toContain('Anglais')
        ->and($assistant->lastPrompt)->toContain('la cuisine est à refaire');

    Mail::assertQueued(VisitReportSent::class, fn (VisitReportSent $mail): bool => $mail->report === 'The client loved the light, the kitchen needs work.');

    // Le compte rendu enregistré reste le texte de l'équipe, en français.
    expect($visit->refresh()->report)->toBe('Le client a adoré la lumière, la cuisine est à refaire.');
});

test('a french client is never sent to the assistant', function (): void {
    Mail::fake();
    $assistant = fakeTranslator('jamais appelé');
    app()->instance(Assistant::class, $assistant);

    $lead = Lead::factory()->converted()->create(['language' => LeadLanguage::French, 'email' => 'lea@example.com']);
    $visit = Visit::factory()->create(['lead_id' => $lead->id, 'scheduled_at' => now()->subHour()]);

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Le client a adoré la lumière.',
            'notify_client' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($assistant->calls)->toBe(0);
    Mail::assertQueued(VisitReportSent::class, fn (VisitReportSent $mail): bool => $mail->report === 'Le client a adoré la lumière.');
});

test('a failing assistant never blocks the e-mail: the original text is sent', function (): void {
    Mail::fake();
    app()->instance(Assistant::class, fakeTranslator(null));

    $lead = Lead::factory()->converted()->create(['language' => LeadLanguage::English, 'email' => 'john@example.com']);
    $visit = Visit::factory()->create(['lead_id' => $lead->id, 'scheduled_at' => now()->subHour()]);

    $this->actingAs(User::factory()->create())
        ->post(route('clients.visits.report', $visit), [
            'report' => 'Le client a adoré la lumière.',
            'notify_client' => true,
        ])
        ->assertSessionHasNoErrors();

    Mail::assertQueued(VisitReportSent::class, fn (VisitReportSent $mail): bool => $mail->report === 'Le client a adoré la lumière.');
});

test('without an assistant key, nothing is translated and nothing fails', function (): void {
    app()->instance(Assistant::class, fakeTranslator('ignoré', configured: false));

    expect(resolve(TranslateText::class)->handle('Bonjour', LeadLanguage::English))->toBe('Bonjour')
        // Un texte vide ne part jamais chez l'assistant.
        ->and(resolve(TranslateText::class)->handle('   ', LeadLanguage::English))->toBe('');
});
