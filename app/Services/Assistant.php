<?php

declare(strict_types=1);

namespace App\Services;

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Messages\TextBlock;
use RuntimeException;

/**
 * Assistant IA (Claude) : une seule porte d'entrée pour les Actions qui ont
 * besoin d'une extraction ou d'un jugement structuré. Toujours une sortie
 * JSON validée par un schéma, jamais de texte libre écrit en base sans relecture.
 */
class Assistant
{
    public function __construct(
        private readonly ?string $key,
        private readonly string $model,
        private ?Client $client = null,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            key: config('services.anthropic.key'),
            model: (string) config('services.anthropic.model', 'claude-opus-5'),
        );
    }

    public function isConfigured(): bool
    {
        return $this->key !== null && $this->key !== '';
    }

    /**
     * Demande une réponse JSON conforme au schéma (sorties structurées).
     *
     * @param  array<string, mixed>  $schema  JSON Schema de l'objet attendu
     * @return array<string, mixed>
     *
     * @throws RuntimeException si l'assistant n'est pas configuré ou si l'API échoue
     */
    public function extract(string $system, string $prompt, array $schema, int $maxTokens = 4_000): array
    {
        throw_unless($this->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

        try {
            $message = $this->client()->messages->create(
                maxTokens: $maxTokens,
                messages: [['role' => 'user', 'content' => $prompt]],
                model: $this->model,
                outputConfig: ['format' => ['type' => 'json_schema', 'schema' => $schema]],
                system: $system,
                requestOptions: ['timeout' => 90],
            );
        } catch (APIStatusException $exception) {
            throw new RuntimeException("Assistant IA : erreur {$exception->getCode()} de l'API.", $exception->getCode(), previous: $exception);
        } catch (APIConnectionException $exception) {
            throw new RuntimeException('Assistant IA injoignable.', $exception->getCode(), previous: $exception);
        }

        throw_if($message->stopReason === 'refusal', RuntimeException::class, 'Assistant IA : demande refusée.');

        foreach ($message->content as $block) {
            if ($block instanceof TextBlock) {
                $data = json_decode($block->text, true);

                if (is_array($data)) {
                    return $data;
                }
            }
        }

        throw new RuntimeException('Assistant IA : réponse illisible.');
    }

    private function client(): Client
    {
        return $this->client ??= new Client(apiKey: $this->key);
    }
}
