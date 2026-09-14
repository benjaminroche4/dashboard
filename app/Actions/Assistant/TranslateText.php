<?php

declare(strict_types=1);

namespace App\Actions\Assistant;

use App\Enums\LeadLanguage;
use App\Services\Assistant;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Traduit un texte écrit par l'équipe dans la langue du client, avant de le
 * lui envoyer. L'équipe écrit toujours en français ; un client anglophone doit
 * lire de l'anglais, pas un paragraphe français au milieu d'un e-mail traduit.
 *
 * Jamais bloquant : sans clé, en cas de panne ou de réponse vide, le texte
 * d'origine part tel quel — un e-mail en français vaut mieux que pas d'e-mail.
 */
final readonly class TranslateText
{
    private const string SYSTEM = <<<'TXT'
Tu traduis des messages écrits par une agence de relocation à Paris pour ses clients.
Traduis fidèlement dans la langue demandée, en gardant le ton, les sauts de ligne et la mise en forme. Ne résume pas, n'ajoute rien, ne commente pas. Les noms propres, les adresses et les montants restent tels quels.
TXT;

    public function __construct(private Assistant $assistant) {}

    /** Le texte traduit, ou le texte d'origine si la traduction n'est pas possible. */
    public function handle(string $text, LeadLanguage $language): string
    {
        $text = trim($text);

        if ($text === '' || $language === LeadLanguage::French || ! $this->assistant->isConfigured()) {
            return $text;
        }

        try {
            $result = $this->assistant->extract(
                self::SYSTEM,
                "Langue cible : {$language->label()}\n\nTexte à traduire :\n{$text}",
                self::schema(),
            );
        } catch (Throwable $exception) {
            Log::warning('Traduction indisponible, le texte d’origine est envoyé.', ['message' => $exception->getMessage()]);

            return $text;
        }

        $translation = trim((string) ($result['translation'] ?? ''));

        return $translation === '' ? $text : $translation;
    }

    /**
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['translation'],
            'properties' => [
                'translation' => ['type' => 'string', 'description' => 'Le texte traduit, sans commentaire ni préambule.'],
            ],
        ];
    }
}
