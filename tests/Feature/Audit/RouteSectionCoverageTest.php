<?php

declare(strict_types=1);

use App\Enums\SiteSection;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Router;

/**
 * `SiteSection::forRoute()` renvoie une liste vide pour une route inconnue, et
 * `EnsureSectionAccess` laisse alors passer tout le monde : une route ajoutée
 * sans être déclarée serait ouverte à tous les membres sans qu'on le remarque.
 * Toute route sans section doit donc être **explicitement** listée ici.
 */

/** Routes volontairement libres, avec la raison. */
const FREE_ROUTES = [
    // Authentification et compte : Fortify, 2FA, clés d'accès, connexion Google.
    'login', 'login.store', 'logout', 'auth.google.redirect', 'auth.google.callback',
    'two-factor.login', 'two-factor.login.store', 'two-factor.enable', 'two-factor.disable',
    'two-factor.confirm', 'two-factor.qr-code', 'two-factor.secret-key',
    'two-factor.recovery-codes', 'two-factor.regenerate-recovery-codes',
    'password.confirm', 'password.confirm.store', 'password.confirmation', 'user-password.update',
    'passkey.login-options', 'passkey.login', 'passkey.confirm-options', 'passkey.confirm',
    'passkey.registration-options', 'passkey.store', 'passkey.destroy', 'well-known.passkeys',
    // Tableau de bord et paramètres : toujours accessibles (les droits du staff
    // passent par le rôle, pas par une section).
    'home', 'dashboard',
    'profile.edit', 'profile.update', 'profile.destroy',
    'profile.avatar.update', 'profile.avatar.destroy',
    'appearance.edit', 'security.edit',
    'team.index', 'team.show', 'team.store', 'team.destroy', 'team.access',
    // Hors session : webhooks signés et dépôt public des pièces.
    'webhooks.rip.contact', 'webhooks.allo',
    'documents.public.show', 'documents.public.store', 'documents.public.verify',
    // Proxy Google Places : sert l'autocomplétion d'adresse de tous les formulaires.
    'places.suggest', 'places.details',
    // Supervision, et routes techniques publiées par les paquets.
    'pulse',
    'default-livewire.update', 'livewire.upload-file', 'livewire.preview-file',
    'storage.local', 'storage.local.upload',
];

test('every named route declares its site section, or is explicitly free', function (): void {
    $undeclared = collect(Router::getRoutes()->getRoutes())
        ->map(fn (Route $route): ?string => $route->getName())
        ->filter(fn (?string $name): bool => $name !== null && $name !== '')
        ->unique()
        ->reject(fn (string $name): bool => in_array($name, FREE_ROUTES, true))
        ->reject(fn (string $name): bool => SiteSection::forRoute($name) !== [])
        ->values()
        ->all();

    expect($undeclared)->toBe([], 'Ces routes ne sont rattachées à aucune section : ajoutez-les à SiteSection::forRoute(), ou à FREE_ROUTES en expliquant pourquoi elles sont ouvertes à tous.');
});

test('every free route is a real route, so the list never rots', function (): void {
    $names = collect(Router::getRoutes()->getRoutes())
        ->map(fn (Route $route): ?string => $route->getName())
        ->filter()
        ->unique()
        ->all();

    expect(array_values(array_diff(FREE_ROUTES, $names)))->toBe([]);
});
