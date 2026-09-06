<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureStaffRole;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\NoIndex;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias(['role' => EnsureStaffRole::class]);

        // Les webhooks sont signés (HMAC), pas protégés par un jeton de session.
        $middleware->validateCsrfTokens(except: ['webhooks/*']);

        // Derrière le répartiteur de charge de Laravel Cloud : nécessaire pour que
        // request()->secure(), les URL https et les cookies « secure » soient corrects.
        $middleware->trustProxies(at: '*');

        // Global, pas seulement « web » : /up, /pulse, /storage et les assets des
        // paquets reçoivent aussi l'en-tête noindex. Le backoffice n'est jamais indexé.
        $middleware->append(NoIndex::class);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->is('api/*') || $request->is('webhooks/*') || $request->expectsJson(),
        );

        // Session expirée sur une page protégée : on l'explique au lieu de renvoyer
        // silencieusement au login. Un visiteur sans cookie de session ne voit rien.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('/')) {
                return null;
            }

            $redirect = redirect()->guest(route('login'));

            if ($request->hasCookie(config('session.cookie'))) {
                $redirect->with('status', __('Votre session a expiré, veuillez vous reconnecter.'));
            }

            return $redirect;
        });

        // Jeton CSRF périmé (419) : on revient sur la page avec un message plutôt qu'une erreur.
        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->expectsJson()) {
                return null;
            }

            return back()->with('status', __('Votre session a expiré, veuillez réessayer.'));
        });
    })->create();
