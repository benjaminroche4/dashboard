<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Récupère le texte d'une page d'annonce (SeLoger, PAP, site d'agence…) :
 * HTML téléchargé côté serveur puis réduit au texte visible.
 */
final class ListingFetcher
{
    public const int MAX_CHARS = 40_000;

    /** Texte de la page, ou null si elle est injoignable ou vide (site qui bloque les robots, etc.). */
    public function fetch(string $url): ?string
    {
        try {
            $response = Http::timeout(12)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
                    'Accept-Language' => 'fr-FR,fr;q=0.9',
                ])
                ->get($url);
        } catch (ConnectionException) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $text = self::toText($response->body());

        return $text === '' ? null : $text;
    }

    /** HTML → texte : scripts et styles retirés, balises supprimées, blancs réduits. */
    public static function toText(string $html): string
    {
        $html = (string) preg_replace('#<(script|style|noscript|svg)\b[^>]*>.*?</\1>#is', ' ', $html);
        $html = (string) preg_replace('#</(p|div|li|tr|h[1-6]|br|section|article)>#i', "\n", $html);
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = (string) preg_replace('/[ \t\x{00A0}]+/u', ' ', $text);
        $text = (string) preg_replace('/\s*\n\s*/', "\n", $text);

        return mb_substr(trim($text), 0, self::MAX_CHARS);
    }
}
