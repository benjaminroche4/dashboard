<?php

declare(strict_types=1);

namespace App\Services;

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Messages\OutputConfig\Effort;
use Anthropic\Messages\TextBlock;
use Illuminate\Support\Facades\Log;
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
    public function extract(string $system, string $prompt, array $schema, int $maxTokens = 8_000, Effort $effort = Effort::LOW): array
    {
        throw_unless($this->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

        try {
            $message = $this->client()->messages->create(
                maxTokens: $maxTokens,
                messages: [['role' => 'user', 'content' => $prompt]],
                model: $this->model,
                outputConfig: ['effort' => $effort, 'format' => ['type' => 'json_schema', 'schema' => $schema]],
                system: $system,
                requestOptions: ['timeout' => 90],
            );
        } catch (APIStatusException $exception) {
            // Le code HTTP vit dans `status` : `getCode()` reste à 0.
            $status = $exception->status ?? 0;

            Log::warning('Assistant IA : appel refusé par l’API.', [
                'status' => $status,
                'type' => $exception->type?->value,
                'model' => $this->model,
            ]);

            throw new RuntimeException(self::statusMessage($status), $status, previous: $exception);
        } catch (APIConnectionException $exception) {
            throw new RuntimeException('Assistant IA injoignable.', $exception->getCode(), previous: $exception);
        }

        throw_if($message->stopReason === 'refusal', RuntimeException::class, 'Assistant IA : demande refusée.');
        throw_if($message->stopReason === 'max_tokens', RuntimeException::class, 'Assistant IA : réponse trop longue, réessayez.');

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

    /** Message lisible par l'équipe pour un refus de l'API. */
    public static function statusMessage(int $status): string
    {
        return match (true) {
            $status === 401 => 'Assistant IA : clé API refusée (ANTHROPIC_API_KEY).',
            $status === 403 => 'Assistant IA : accès refusé pour cette clé.',
            $status === 404 => 'Assistant IA : modèle introuvable (ANTHROPIC_MODEL).',
            $status === 429 => 'Assistant IA : trop de demandes, réessayez dans un instant.',
            $status === 400 || $status === 422 => 'Assistant IA : demande rejetée par l’API.',
            $status >= 500 => 'Assistant IA : l’API est en panne, réessayez plus tard.',
            default => "Assistant IA : erreur {$status} de l'API.",
        };
    }

    private function client(): Client
    {
        return $this->client ??= new Client(apiKey: $this->key);
    }
}
