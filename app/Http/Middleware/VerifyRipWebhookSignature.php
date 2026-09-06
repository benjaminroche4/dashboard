<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authentifie les appels du site Relocation In Paris : l'en-tête `X-Signature`
 * doit valoir `sha256=<HMAC-SHA256 du corps brut avec RIP_WEBHOOK_SECRET>`.
 * Sans secret configuré, la route est fermée (503) : jamais ouverte par défaut.
 */
class VerifyRipWebhookSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.rip.webhook_secret');

        abort_if(! is_string($secret) || $secret === '', 503, 'Webhook non configuré.');

        $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);
        $given = (string) $request->header('X-Signature', '');

        abort_unless(hash_equals($expected, $given), 401, 'Signature invalide.');

        return $next($request);
    }
}
