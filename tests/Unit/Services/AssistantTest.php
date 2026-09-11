<?php

declare(strict_types=1);

use Anthropic\Core\Exceptions\APIStatusException;
use App\Services\Assistant;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Tests\TestCase;

uses(TestCase::class);

test('an assistant without a key is not configured and refuses to extract', function (): void {
    $assistant = new Assistant(null, 'claude-opus-5');

    expect($assistant->isConfigured())->toBeFalse()
        ->and(fn (): array => $assistant->extract('s', 'p', []))
        ->toThrow(RuntimeException::class, 'Assistant IA non configuré');
});

test('the HTTP status of a refusal lives on the exception, never on getCode()', function (): void {
    $refusal = APIStatusException::from(
        new Request('POST', 'https://api.anthropic.com/v1/messages'),
        new Response(401, [], (string) json_encode(['error' => ['type' => 'authentication_error']])),
    );

    // C'est la cause de l'ancien message « erreur 0 de l'API ».
    expect($refusal->getCode())->toBe(0)
        ->and($refusal->status)->toBe(401)
        ->and($refusal->type?->value)->toBe('authentication_error');
});

test('each refusal of the API gets a message the team can act on', function (int $status, string $expected): void {
    expect(Assistant::statusMessage($status))->toContain($expected);
})->with([
    [401, 'clé API refusée'],
    [403, 'accès refusé'],
    [404, 'modèle introuvable'],
    [429, 'trop de demandes'],
    [400, 'demande rejetée'],
    [503, 'en panne'],
    // Un code inattendu reste affiché tel quel, mais jamais zéro.
    [418, "erreur 418 de l'API"],
]);
