<?php

declare(strict_types=1);

namespace App\Actions\Mail;

use App\Actions\Leads\SendLeadDossier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Vérifie la chaîne d'envoi des e-mails de bout en bout.
 *
 * Les quinze mailables du projet sont tous `ShouldQueue` : un e-mail qui « ne
 * part pas » échoue toujours **en silence**, à l'un de quatre endroits — le
 * transport est resté sur `log`, la clé du fournisseur manque, le worker de
 * queue ne tourne pas, ou l'expéditeur est refusé. Cette Action les distingue
 * au lieu de faire deviner.
 */
final class CheckMailSetup
{
    /** Niveaux d'un point de contrôle, du plus grave au plus anodin. */
    public const string FAIL = 'fail';

    public const string WARN = 'warn';

    public const string OK = 'ok';

    /**
     * @return list<array{level: string, check: string, detail: string}>
     */
    public function handle(): array
    {
        return [
            ...$this->transport(),
            ...$this->sender(),
            ...$this->provider(),
            ...$this->queue(),
        ];
    }

    /**
     * Vrai si un point de contrôle au moins est en échec.
     *
     * @param  list<array{level: string, check: string, detail: string}>  $checks
     */
    public static function failed(array $checks): bool
    {
        return array_any($checks, fn (array $check): bool => $check['level'] === self::FAIL);
    }

    /**
     * @return list<array{level: string, check: string, detail: string}>
     */
    private function transport(): array
    {
        $mailer = (string) config('mail.default');

        // `log` et `array` écrivent dans un fichier ou en mémoire : l'envoi
        // « réussit » partout dans le code, et personne ne reçoit rien.
        if ($mailer === 'log' || $mailer === 'array') {
            return [[
                'level' => app()->environment('production') ? self::FAIL : self::WARN,
                'check' => 'Transport',
                'detail' => "MAIL_MAILER={$mailer} : les e-mails ne sortent pas de l’application.",
            ]];
        }

        $checks = [[
            'level' => self::OK,
            'check' => 'Transport',
            'detail' => "MAIL_MAILER={$mailer}",
        ]];

        if ($mailer === 'resend' && (string) config('services.resend.key') === '') {
            $checks[] = [
                'level' => self::FAIL,
                'check' => 'Clé Resend',
                'detail' => 'RESEND_API_KEY est vide : chaque envoi lèvera une erreur.',
            ];
        }

        if ($mailer === 'smtp' && (string) config('mail.mailers.smtp.host') === '127.0.0.1') {
            $checks[] = [
                'level' => self::WARN,
                'check' => 'Hôte SMTP',
                'detail' => 'MAIL_HOST est resté sur 127.0.0.1.',
            ];
        }

        return $checks;
    }

    /**
     * @return list<array{level: string, check: string, detail: string}>
     */
    private function sender(): array
    {
        $from = (string) config('mail.from.address');
        /** @var list<string> $domains */
        $domains = config('company.mail.sender_domains', []);

        if ($from === '' || $from === 'hello@example.com') {
            return [[
                'level' => self::FAIL,
                'check' => 'Expéditeur',
                'detail' => 'MAIL_FROM_ADDRESS n’est pas renseignée.',
            ]];
        }

        $checks = [[
            'level' => self::OK,
            'check' => 'Expéditeur',
            'detail' => $from,
        ]];

        // L'adresse d'expédition doit être sur un domaine vérifié chez le
        // fournisseur, sinon l'envoi est rejeté (403 chez Resend).
        if (! SendLeadDossier::canSendAs($from)) {
            $parent = $this->parentDomainOf($from, $domains);

            $checks[] = [
                'level' => self::WARN,
                'check' => 'Domaine d’expédition',
                // Un sous-domaine est le piège classique d'une application
                // hébergée sur `dashboard.exemple.fr` : vérifier le domaine
                // parent chez Resend ne vérifie pas ses sous-domaines, chacun
                // portant ses propres DKIM et SPF.
                'detail' => $parent === null
                    ? "{$from} n’est pas sur un domaine déclaré (".(implode(', ', $domains) ?: 'aucun').').'
                    : "{$from} est sur un sous-domaine de {$parent} : Resend les vérifie séparément. Expédiez depuis {$parent}, ou déclarez le sous-domaine chez Resend et dans COMPANY_SENDER_DOMAINS.",
            ];
        }

        // Les e-mails portent des liens (dépôt des pièces, fiche d'un lead) :
        // une APP_URL absente ou restée en local les rend inutilisables.
        $appUrl = (string) config('app.url');

        // En local, `localhost` est la bonne réponse : on ne le signale qu'en
        // production, où il casserait tous les liens.
        if (app()->environment('production') && ($appUrl === '' || str_contains($appUrl, 'localhost'))) {
            $checks[] = [
                'level' => self::FAIL,
                'check' => 'Adresse de l’application',
                'detail' => "APP_URL={$appUrl} : les liens des e-mails ne mèneront nulle part.",
            ];
        }

        $company = (string) config('company.email');

        if ($company !== '' && ! SendLeadDossier::canSendAs($company)) {
            $checks[] = [
                'level' => self::WARN,
                'check' => 'Adresse de contact',
                'detail' => "COMPANY_EMAIL ({$company}) n’est pas sur un domaine déclaré : les alertes partiront d’un domaine non vérifié.",
            ];
        }

        return $checks;
    }

    /**
     * Domaines réellement vérifiés chez Resend, demandés à Resend.
     *
     * `COMPANY_SENDER_DOMAINS` est tenue à la main : elle dit ce qu'on croit
     * vérifié, pas ce qui l'est. Or un domaine qu'elle déclare à tort fait
     * remplacer l'expéditeur par l'adresse d'un conseiller que Resend refuse
     * ensuite en 403 — le message part de trois endroits (dossier au lead,
     * bienvenue d'annuaire, transmission à un partenaire) et échoue en
     * silence. On confronte donc la liste à la source.
     *
     * @return list<array{level: string, check: string, detail: string}>
     */
    private function provider(): array
    {
        if ((string) config('mail.default') !== 'resend' || (string) config('services.resend.key') === '') {
            return [];
        }

        $verified = $this->verifiedDomains();

        if ($verified === null) {
            return [[
                'level' => self::WARN,
                'check' => 'Domaines Resend',
                'detail' => 'Impossible d’interroger Resend : vérification faite sur COMPANY_SENDER_DOMAINS seulement.',
            ]];
        }

        $checks = [[
            'level' => $verified === [] ? self::FAIL : self::OK,
            'check' => 'Domaines Resend',
            'detail' => $verified === []
                ? 'Aucun domaine vérifié chez Resend : aucun envoi ne passera.'
                : 'Vérifiés : '.implode(', ', $verified),
        ]];

        $from = strtolower(ltrim((string) strrchr((string) config('mail.from.address'), '@'), '@'));

        if ($from !== '' && ! in_array($from, $verified, true)) {
            $checks[] = [
                'level' => self::FAIL,
                'check' => 'Expéditeur vérifié',
                'detail' => "{$from} n’est pas vérifié chez Resend : tout envoi sera rejeté en 403.",
            ];
        }

        /** @var list<string> $declared */
        $declared = config('company.mail.sender_domains', []);
        $unverified = array_values(array_filter(
            array_map(fn (string $domain): string => strtolower(trim($domain)), $declared),
            fn (string $domain): bool => $domain !== '' && ! in_array($domain, $verified, true),
        ));

        if ($unverified !== []) {
            $checks[] = [
                'level' => self::FAIL,
                'check' => 'COMPANY_SENDER_DOMAINS',
                'detail' => implode(', ', $unverified).' : déclaré(s) mais non vérifié(s). Un conseiller sur ce domaine fera échouer l’envoi.',
            ];
        }

        return [...$checks, ...$this->staffDomains($verified)];
    }

    /**
     * Domaines des adresses de l'équipe : ce sont eux qui deviennent
     * l'expéditeur quand le conseiller écrit en son nom.
     *
     * @param  list<string>  $verified
     * @return list<array{level: string, check: string, detail: string}>
     */
    private function staffDomains(array $verified): array
    {
        try {
            /** @var list<string> $emails */
            $emails = User::query()->pluck('email')->all();
        } catch (Throwable) {
            return [];
        }

        $domains = array_values(array_unique(array_map(
            fn (string $email): string => strtolower(ltrim((string) strrchr($email, '@'), '@')),
            $emails,
        )));
        // Seuls comptent les domaines que `canSendAs()` accepte : les autres
        // retombent sur l'expéditeur par défaut, qui est vérifié plus haut.
        $sending = array_values(array_filter(
            $domains,
            fn (string $domain): bool => $domain !== '' && SendLeadDossier::canSendAs("x@{$domain}"),
        ));
        $broken = array_values(array_filter($sending, fn (string $domain): bool => ! in_array($domain, $verified, true)));

        if ($broken === []) {
            return [];
        }

        return [[
            'level' => self::FAIL,
            'check' => 'Adresses de l’équipe',
            'detail' => implode(', ', $broken).' : des membres écrivent depuis ce domaine, non vérifié chez Resend.',
        ]];
    }

    /**
     * @return list<string>|null Domaines vérifiés, null si Resend est injoignable
     */
    private function verifiedDomains(): ?array
    {
        try {
            $response = Http::withToken((string) config('services.resend.key'))
                ->timeout(8)
                ->get('https://api.resend.com/domains');

            if ($response->failed()) {
                return null;
            }

            /** @var list<array{name?: string, status?: string}> $data */
            $data = $response->json('data') ?? [];

            return array_values(array_map(
                fn (array $domain): string => strtolower((string) ($domain['name'] ?? '')),
                array_filter($data, fn (array $domain): bool => ($domain['status'] ?? '') === 'verified'),
            ));
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return list<array{level: string, check: string, detail: string}>
     */
    private function queue(): array
    {
        $connection = (string) config('queue.default');

        if ($connection === 'sync') {
            return [[
                'level' => self::WARN,
                'check' => 'File d’attente',
                'detail' => 'QUEUE_CONNECTION=sync : les e-mails partent dans la requête, sans worker.',
            ]];
        }

        $checks = [[
            'level' => self::OK,
            'check' => 'File d’attente',
            'detail' => "QUEUE_CONNECTION={$connection}",
        ]];

        // Sur la queue `database`, les tables disent tout : des travaux en
        // attente qui ne baissent pas = aucun worker ; des échecs = le
        // transport refuse.
        if ($connection !== 'database') {
            return $checks;
        }

        try {
            if (Schema::hasTable('jobs')) {
                $pending = DB::table('jobs')->count();
                $checks[] = [
                    'level' => $pending > 0 ? self::WARN : self::OK,
                    'check' => 'Travaux en attente',
                    'detail' => $pending === 0
                        ? 'Aucun travail en attente.'
                        : "{$pending} en attente : si ce nombre ne baisse pas, le worker `php artisan queue:work` ne tourne pas.",
                ];
            }

            if (Schema::hasTable('failed_jobs')) {
                $failed = DB::table('failed_jobs')->count();
                $last = $failed === 0 ? null : DB::table('failed_jobs')->latest('failed_at')->first();
                $checks[] = [
                    'level' => $failed > 0 ? self::FAIL : self::OK,
                    'check' => 'Travaux en échec',
                    'detail' => $failed === 0
                        ? 'Aucun échec.'
                        : "{$failed} en échec. Dernier : ".$this->firstLine((string) ($last->exception ?? '')),
                ];
            }
        } catch (Throwable $e) {
            $checks[] = [
                'level' => self::WARN,
                'check' => 'File d’attente',
                'detail' => 'Impossible de lire les tables de queue : '.$e->getMessage(),
            ];
        }

        return $checks;
    }

    /**
     * Domaine déclaré dont `$email` est un sous-domaine, s'il y en a un.
     *
     * @param  list<string>  $domains
     */
    private function parentDomainOf(string $email, array $domains): ?string
    {
        $domain = strtolower(ltrim((string) strrchr($email, '@'), '@'));

        foreach ($domains as $declared) {
            $declared = strtolower(trim($declared));

            if ($declared !== '' && str_ends_with($domain, '.'.$declared)) {
                return $declared;
            }
        }

        return null;
    }

    /** Première ligne d'une trace d'exception, seule utile à l'écran. */
    private function firstLine(string $exception): string
    {
        $line = strtok($exception, "\n");

        return $line === false ? '' : mb_substr($line, 0, 200);
    }
}
