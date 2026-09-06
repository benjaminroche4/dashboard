<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authentifie les webhooks Allo (format Standard Webhooks) : en-têtes `webhook-id`,
 * `webhook-timestamp` (secondes Unix, tolérance 5 min) et `webhook-signature`
 * (« v1,<base64> », plusieurs séparées par des espaces), signature HMAC-SHA256 de
 * `{id}.{timestamp}.{corps brut}` avec le secret `whsec_<base64>` décodé.
 * Sans secret configuré, la route est fermée (503).
 */
class VerifyAlloWebhookSignature
{
    private const int TOLERANCE_SECONDS = 300;

    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.allo.webhook_secret');

        abort_if(! is_string($secret) || $secret === '', 503, 'Webhook non configuré.');

        $id = (string) $request->header('webhook-id', '');
        $timestamp = (string) $request->header('webhook-timestamp', '');
        $signatures = (string) $request->header('webhook-signature', '');

        abort_if($id === '' || $timestamp === '' || $signatures === '', 401, 'Signature manquante.');
        abort_if(! ctype_digit($timestamp) || abs(now()->getTimestamp() - (int) $timestamp) > self::TOLERANCE_SECONDS, 401, 'Horodatage invalide.');

        abort_unless($this->isValid($id, $timestamp, $request->getContent(), $signatures, $secret), 401, 'Signature invalide.');

        return $next($request);
    }

    public static function sign(string $id, string $timestamp, string $body, string $secret): string
    {
        $key = base64_decode(str_starts_with($secret, 'whsec_') ? substr($secret, 6) : $secret, true);

        return base64_encode(hash_hmac('sha256', "{$id}.{$timestamp}.{$body}", $key === false ? '' : $key, true));
    }

    private function isValid(string $id, string $timestamp, string $body, string $signatures, string $secret): bool
    {
        $expected = self::sign($id, $timestamp, $body, $secret);

        foreach (explode(' ', $signatures) as $signature) {
            [$version, $value] = array_pad(explode(',', $signature, 2), 2, '');

            if ($version === 'v1' && hash_equals($expected, $value)) {
                return true;
            }
        }

        return false;
    }
}
