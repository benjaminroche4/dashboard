<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SignInWithGoogle;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use RuntimeException;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

/**
 * « Se connecter avec Google » : ouvre la session d'un membre déjà créé.
 * Aucune inscription, aucun compte créé au passage.
 */
class GoogleLoginController extends Controller
{
    /** Envoie vers Google, si la connexion Google est configurée. */
    public function redirect(): SymfonyRedirect|RedirectResponse
    {
        abort_unless(self::configured(), 404);

        return Socialite::driver('google')->redirect();
    }

    /** Retour de Google : on reconnaît le membre à son adresse e-mail. */
    public function callback(Request $request, SignInWithGoogle $signIn): RedirectResponse
    {
        abort_unless(self::configured(), 404);

        try {
            $account = Socialite::driver('google')->user();
        } catch (Throwable $exception) {
            report($exception);

            return to_route('login')->withErrors(['email' => __('La connexion avec Google a échoué. Réessayez.')]);
        }

        try {
            $user = $signIn->handle($account);
        } catch (RuntimeException $exception) {
            Log::info('Connexion Google refusée.', ['message' => $exception->getMessage()]);

            return to_route('login')->withErrors(['email' => $exception->getMessage()]);
        }

        // La double authentification reste due : on repasse par le défi de Fortify.
        if ($signIn->awaitsTwoFactor($user)) {
            $request->session()->put(['login.id' => $user->getKey(), 'login.remember' => false]);

            return to_route('two-factor.login');
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    /** La connexion Google n'existe que si les identifiants sont configurés. */
    public static function configured(): bool
    {
        return config('services.google.client_id') !== null && config('services.google.client_secret') !== null;
    }
}
