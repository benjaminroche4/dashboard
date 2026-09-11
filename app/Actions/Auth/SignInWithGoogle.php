<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use RuntimeException;

/**
 * Connexion d'un membre par son compte Google.
 *
 * Le backoffice n'a pas d'inscription : le compte Google ne crée jamais de
 * membre, il reconnaît un membre déjà créé par un admin à son adresse e-mail.
 * L'ouverture de session reste au contrôleur.
 */
final class SignInWithGoogle
{
    /**
     * @return User Le membre reconnu, à connecter par l'appelant.
     *
     * @throws RuntimeException Compte Google refusé (domaine, e-mail inconnu).
     */
    public function handle(SocialiteUser $account): User
    {
        $email = mb_strtolower(trim((string) $account->getEmail()));

        if ($email === '') {
            throw new RuntimeException(__('Ce compte Google ne donne pas d’adresse e-mail.'));
        }

        if (! $this->domainAllowed($email)) {
            throw new RuntimeException(__('Ce domaine n’est pas autorisé à se connecter.'));
        }

        $user = User::query()->whereRaw('lower(email) = ?', [$email])->first();

        if (! $user instanceof User) {
            throw new RuntimeException(__('Aucun membre de l’équipe n’utilise cette adresse. Demandez à un administrateur de vous créer un accès.'));
        }

        return $user;
    }

    /** Le second facteur reste à fournir avant d'entrer. */
    public function awaitsTwoFactor(User $user): bool
    {
        return $user->two_factor_secret !== null && $user->two_factor_confirmed_at !== null;
    }

    /** Domaines autorisés, s'il y en a de configurés. */
    private function domainAllowed(string $email): bool
    {
        $domains = array_filter(array_map(
            fn (string $domain): string => mb_strtolower(trim($domain)),
            explode(',', (string) config('services.google.allowed_domains')),
        ));

        if ($domains === []) {
            return true;
        }

        return in_array(mb_strtolower((string) mb_strrchr($email, '@', false)), $domains, true);
    }
}
