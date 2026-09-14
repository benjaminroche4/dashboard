<?php

declare(strict_types=1);

use App\Actions\Mail\CheckMailSetup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

beforeEach(function (): void {
    // Aucun test ne sort sur le réseau : un appel non simulé doit échouer
    // bruyamment plutôt que d'interroger la vraie API Resend.
    Http::preventStrayRequests();
});

/** Niveau du point de contrôle nommé, ou null s'il n'a pas été relevé. */
function checkLevel(array $checks, string $name): ?string
{
    foreach ($checks as $check) {
        if ($check['check'] === $name) {
            return $check['level'];
        }
    }

    return null;
}

it('signals a transport that never leaves the application', function (): void {
    config(['mail.default' => 'log']);

    $checks = resolve(CheckMailSetup::class)->handle();

    expect(checkLevel($checks, 'Transport'))->toBe(CheckMailSetup::WARN);
});

it('fails on a missing provider key', function (): void {
    config(['mail.default' => 'resend', 'services.resend.key' => '']);

    $checks = resolve(CheckMailSetup::class)->handle();

    expect(checkLevel($checks, 'Clé Resend'))->toBe(CheckMailSetup::FAIL)
        ->and(CheckMailSetup::failed($checks))->toBeTrue();
});

it('warns when the sender is not on a verified domain', function (): void {
    config([
        'mail.default' => 'resend',
        'services.resend.key' => 're_test',
        'mail.from.address' => 'contact@ailleurs.com',
        'company.mail.sender_domains' => ['relocation-in-paris.fr'],
    ]);

    resendDomains([]);

    $checks = resolve(CheckMailSetup::class)->handle();

    expect(checkLevel($checks, 'Domaine d’expédition'))->toBe(CheckMailSetup::WARN);
});

it('fails on a sender that was never configured', function (): void {
    config(['mail.default' => 'resend', 'services.resend.key' => 're_test', 'mail.from.address' => 'hello@example.com']);

    resendDomains([]);

    $checks = resolve(CheckMailSetup::class)->handle();

    expect(checkLevel($checks, 'Expéditeur'))->toBe(CheckMailSetup::FAIL);
});

it('reads the queue tables to tell a dead worker from a broken transport', function (): void {
    config(['queue.default' => 'database']);

    // Un travail en attente : soit le worker vient de démarrer, soit il est mort.
    DB::table('jobs')->insert([
        'queue' => 'default',
        'payload' => '{}',
        'attempts' => 0,
        'reserved_at' => null,
        'available_at' => now()->timestamp,
        'created_at' => now()->timestamp,
    ]);

    expect(checkLevel(resolve(CheckMailSetup::class)->handle(), 'Travaux en attente'))->toBe(CheckMailSetup::WARN);

    // Un échec, lui, ne laisse pas de doute : le transport a refusé.
    DB::table('failed_jobs')->insert([
        'uuid' => (string) Str::uuid(),
        'connection' => 'database',
        'queue' => 'default',
        'payload' => '{}',
        'exception' => "Resend: domain is not verified\n#0 …",
        'failed_at' => now(),
    ]);

    $checks = resolve(CheckMailSetup::class)->handle();

    expect(checkLevel($checks, 'Travaux en échec'))->toBe(CheckMailSetup::FAIL)
        ->and(CheckMailSetup::failed($checks))->toBeTrue();
});

it('runs from the console and reports the outcome', function (): void {
    config(['mail.default' => 'resend', 'services.resend.key' => '']);

    $this->artisan('mail:check')
        ->expectsOutputToContain('RESEND_API_KEY')
        ->assertFailed();
});

it('names the parent domain when the sender sits on a subdomain', function (): void {
    config([
        'mail.default' => 'resend',
        'services.resend.key' => 're_test',
        // Le backoffice vit sur dashboard.relocation-in-paris.fr : on est
        // tenté d'y poser aussi l'expéditeur, que Resend refusera.
        'mail.from.address' => 'contact@dashboard.relocation-in-paris.fr',
        'company.mail.sender_domains' => ['relocation-in-paris.fr'],
    ]);

    resendDomains([]);

    $checks = resolve(CheckMailSetup::class)->handle();
    $detail = '';

    foreach ($checks as $check) {
        if ($check['check'] === 'Domaine d’expédition') {
            $detail = $check['detail'];
        }
    }

    expect(checkLevel($checks, 'Domaine d’expédition'))->toBe(CheckMailSetup::WARN)
        ->and($detail)->toContain('sous-domaine de relocation-in-paris.fr');
});

it('signals an application address that would break the links of every e-mail', function (): void {
    config([
        'mail.default' => 'resend',
        'services.resend.key' => 're_test',
        'mail.from.address' => 'contact@relocation-in-paris.fr',
        'company.mail.sender_domains' => ['relocation-in-paris.fr'],
        'app.url' => 'http://localhost',
    ]);

    resendDomains([]);

    // Hors production, `localhost` est la bonne réponse : rien à signaler.
    expect(checkLevel(resolve(CheckMailSetup::class)->handle(), 'Adresse de l’application'))->toBeNull();

    app()->detectEnvironment(fn (): string => 'production');

    expect(checkLevel(resolve(CheckMailSetup::class)->handle(), 'Adresse de l’application'))
        ->toBe(CheckMailSetup::FAIL);
});

/** Réponse de l'API Resend listant des domaines et leur état. */
function resendDomains(array $domains): void
{
    Http::fake(['api.resend.com/domains' => Http::response(['data' => $domains])]);
}

it('confronts the declared domains with what Resend has really verified', function (): void {
    config([
        'mail.default' => 'resend',
        'services.resend.key' => 're_test',
        'mail.from.address' => 'contact@dashboard.relocation-in-paris.fr',
        'company.mail.sender_domains' => ['dashboard.relocation-in-paris.fr', 'estate-in-paris.fr'],
    ]);

    resendDomains([
        ['name' => 'dashboard.relocation-in-paris.fr', 'status' => 'verified'],
        // Déclaré chez nous, mais la vérification n'est pas allée au bout.
        ['name' => 'estate-in-paris.fr', 'status' => 'pending'],
    ]);

    $checks = resolve(CheckMailSetup::class)->handle();
    $detail = '';

    foreach ($checks as $check) {
        if ($check['check'] === 'COMPANY_SENDER_DOMAINS') {
            $detail = $check['detail'];
        }
    }

    expect(checkLevel($checks, 'Domaines Resend'))->toBe(CheckMailSetup::OK)
        ->and(checkLevel($checks, 'Expéditeur vérifié'))->toBeNull()
        ->and(checkLevel($checks, 'COMPANY_SENDER_DOMAINS'))->toBe(CheckMailSetup::FAIL)
        ->and($detail)->toContain('estate-in-paris.fr');
});

it('fails when the sender itself is not verified at Resend', function (): void {
    config([
        'mail.default' => 'resend',
        'services.resend.key' => 're_test',
        'mail.from.address' => 'contact@relocation-in-paris.fr',
        'company.mail.sender_domains' => ['relocation-in-paris.fr'],
    ]);

    resendDomains([['name' => 'dashboard.relocation-in-paris.fr', 'status' => 'verified']]);

    $checks = resolve(CheckMailSetup::class)->handle();

    expect(checkLevel($checks, 'Expéditeur vérifié'))->toBe(CheckMailSetup::FAIL)
        ->and(CheckMailSetup::failed($checks))->toBeTrue();
});

it('names the team domains that would make an advisor send fail', function (): void {
    config([
        'mail.default' => 'resend',
        'services.resend.key' => 're_test',
        'mail.from.address' => 'contact@dashboard.relocation-in-paris.fr',
        // L'apex est déclaré : un conseiller écrira donc en son nom depuis lui.
        'company.mail.sender_domains' => ['dashboard.relocation-in-paris.fr', 'relocation-in-paris.fr'],
    ]);

    User::factory()->staff()->create(['email' => 'charles@relocation-in-paris.fr']);

    resendDomains([['name' => 'dashboard.relocation-in-paris.fr', 'status' => 'verified']]);

    $checks = resolve(CheckMailSetup::class)->handle();
    $detail = '';

    foreach ($checks as $check) {
        if ($check['check'] === 'Adresses de l’équipe') {
            $detail = $check['detail'];
        }
    }

    expect(checkLevel($checks, 'Adresses de l’équipe'))->toBe(CheckMailSetup::FAIL)
        ->and($detail)->toContain('relocation-in-paris.fr');
});

it('keeps checking on the declared list when Resend cannot be reached', function (): void {
    config(['mail.default' => 'resend', 'services.resend.key' => 're_test']);

    Http::fake(['api.resend.com/domains' => Http::response([], 500)]);

    expect(checkLevel(resolve(CheckMailSetup::class)->handle(), 'Domaines Resend'))->toBe(CheckMailSetup::WARN);
});
