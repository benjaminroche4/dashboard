<?php

declare(strict_types=1);

use Anthropic\Messages\OutputConfig\Effort;
use App\Actions\Partners\DraftPartnerMessage;
use App\Enums\PartnerRole;
use App\Models\Lead;
use App\Models\LeadPartner;
use App\Models\Partner;
use App\Models\User;
use App\Services\Assistant;

function messageAssistant(array $reply): Assistant
{
    return new class($reply) extends Assistant
    {
        public string $lastPrompt = '';

        public function __construct(private readonly array $reply)
        {
            parent::__construct(key: 'test-key', model: 'claude-opus-5');
        }

        public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8000, Effort $effort = Effort::LOW): array
        {
            $this->lastPrompt = $prompt;

            return $this->reply;
        }
    };
}

it('drafts the message from the partner role and the client project', function (): void {
    $advisor = User::factory()->staff()->create(['name' => 'Charles Petit']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'arrival_at' => '2026-11-01']);
    $partner = Partner::factory()->create(['name' => 'Garantme']);
    $link = LeadPartner::query()->create(['lead_id' => $lead->id, 'partner_id' => $partner->id, 'role' => PartnerRole::Guarantee, 'note' => 'Dossier urgent']);
    $assistant = messageAssistant(['message' => "Bonjour,\n\nJe vous transmets…\n\nCharles"]);
    app()->instance(Assistant::class, $assistant);

    $message = resolve(DraftPartnerMessage::class)->handle($link, $advisor);

    expect($message)->toStartWith('Bonjour,')
        ->and($assistant->lastPrompt)->toContain('Charles Petit')->toContain('Garantme')->toContain('Garantie')->toContain('Léa Durand')->toContain('1 novembre 2026')->toContain('Dossier urgent');
});

it('answers the draft as JSON and refuses a link of another lead', function (): void {
    $advisor = User::factory()->staff()->create();
    $lead = Lead::factory()->create();
    $other = Lead::factory()->create();
    $partner = Partner::factory()->create();
    $link = LeadPartner::query()->create(['lead_id' => $other->id, 'partner_id' => $partner->id, 'role' => PartnerRole::Moving]);
    app()->instance(Assistant::class, messageAssistant(['message' => 'Bonjour.']));

    $this->actingAs($advisor)
        ->postJson(route('leads.partners.forward.draft', ['lead' => $lead, 'partnerLink' => $link]))
        ->assertNotFound();
    $this->actingAs($advisor)
        ->postJson(route('leads.partners.forward.draft', ['lead' => $other, 'partnerLink' => $link]))
        ->assertOk()
        ->assertJsonPath('message', 'Bonjour.');
});
