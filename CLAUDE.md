# Dashboard — instructions pour Claude Code

Backoffice **réservé au staff**. Aucune page publique hormis `/login`. Aucun SEO.
Déployé sur **Laravel Cloud**.

## Stack

| Couche        | Choix                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| Backend       | Laravel 13, PHP 8.4, Fortify (auth), Reverb (websockets)                           |
| Frontend      | Inertia v3 + React 19 + TypeScript strict, Vite (vite-plus), Tailwind v4           |
| UI            | shadcn/ui (`resources/js/components/ui`), Lucide icons                             |
| Routes typées | Wayfinder (`resources/js/routes`, `resources/js/actions`, générés, non versionnés) |
| Temps réel    | Laravel Echo (`@laravel/echo-react`) + Reverb                                      |
| Tests         | Pest (PHP), Vitest + Testing Library (front)                                       |
| Qualité       | Pint, PHPStan/Larastan niveau 7, oxlint + oxfmt (`vp check`), `tsc --noEmit`       |
| DB            | SQLite en local, Postgres/MySQL sur Laravel Cloud                                  |

## Commandes (Makefile)

```
make install   # composer + npm + .env + clé + migrations
make start     # serveur HTTP + queue + Reverb + Vite + logs  (= composer dev)
make clean     # optimize:clear + purge du build Vite
make fresh     # migrate:fresh --seed (fixtures : admin@admin.fr et admin2@admin.fr, mdp "admin")
make test      # Pest puis Vitest
make lint      # Rector + Pint + oxlint/oxfmt --fix
make refactor  # Rector en dry-run
make hooks     # active le hook git pre-commit (fait par make install)
make types     # PHPStan + tsc
make check     # lint + types + test — à lancer avant chaque commit
make build     # build de prod des assets
```

Un hook **pre-commit** (`scripts/hooks/pre-commit`, activé via `core.hooksPath`) lance `make check` : un commit rouge est refusé. Ne jamais contourner avec `--no-verify`.

Comptes staff : **pas d'inscription**. Créer un membre avec :

```
php artisan staff:create --name="Nom" --email=nom@exemple.com
```

## Règles d'accès et SEO

- Toute route applicative est derrière le middleware `auth`. `/` redirige vers `login` ou `dashboard`.
- Registration, reset password et vérification email sont **désactivés** dans `config/fortify.php`. Ne pas les réactiver.
- 2FA, passkeys et confirmation de mot de passe restent actifs (côté authentifié uniquement).
- `App\Http\Middleware\NoIndex` ajoute `X-Robots-Tag: noindex` sur toutes les réponses web, `public/robots.txt` bloque tout, le layout Blade porte `<meta name="robots" content="noindex">`. Ne jamais ajouter de sitemap, d'OpenGraph ni de meta SEO.

## Temps réel (obligatoire pour toute action du backoffice)

Quand un membre du staff fait une action, les autres membres connectés doivent la voir **sans refresh**.

1. Côté PHP, après la mutation, dispatcher `App\Events\DashboardUpdated::dispatch('<resource>', [...payload])`.
   L'événement est diffusé sur le canal de présence `staff` (autorisation dans `routes/channels.php`), nom d'événement `dashboard.updated`.
2. Côté React, dans la page concernée : `useStaffChannel(['props', 'à', 'recharger'])` (`resources/js/hooks/use-staff-channel.ts`).
   Le hook fait un `router.reload({ only })` Inertia à chaque événement. Passer un callback en 2e argument pour un toast (`sonner`) ou une mise à jour optimiste.
3. Créer un événement dédié seulement si le payload devient métier (ex. `OrderShipped`). Il doit alors implémenter `ShouldBroadcast` et diffuser sur `PresenceChannel('staff')`.
4. Les événements passent par la **queue** : `make start` lance `queue:listen`. En prod, Laravel Cloud doit avoir un worker.

Echo est configuré dans `resources/js/app.tsx` via `configureEcho({ broadcaster: 'reverb' })` et lit les variables `VITE_REVERB_*`.

## Architecture et conventions

Ces règles sont **vérifiées par `tests/Architecture/ArchitectureTest.php`** (pest-plugin-arch). Une violation casse la suite.

- `declare(strict_types=1)` dans tout `app/`. Pas de `dd`, `dump`, `env()` hors `config/`.
- **Actions** (`app/Actions/<Domaine>/<Verbe><Nom>.php`) : classe `final`, une méthode `handle()`, injectable, sans dépendance HTTP. Toute logique métier vit là, jamais dans les contrôleurs ni dans les commandes. Exemple : `App\Actions\Staff\CreateStaffMember`.
- **DTOs** (`app/Data/<Nom>Data.php`) : `final readonly`, constructeur nommé, `from(array)` et `toArray()`. Une Action reçoit un DTO dès qu'elle a plus de deux paramètres. Exemple : `App\Data\StaffMemberData`.
- **Form Requests** (`app/Http/Requests`, suffixe `Request`) pour toute validation HTTP. Le contrôleur construit le DTO depuis `$request->validated()` et appelle l'Action.
- **Contrôleurs** fins : Form Request, Action, réponse Inertia ou redirection. Jamais de `DB::` ni de `Validator::` dedans.
- **Enums PHP** (`app/Enums`) pour tout état métier, castés dans le modèle. Jamais de chaînes magiques.
- **Policies** (`app/Policies`) dès le premier modèle métier, même si tout le staff a les mêmes droits aujourd'hui.
- **Commandes artisan** `final`, déléguant à une Action.
- **Événements** dans `app/Events`, **commandes** dans `app/Console/Commands`, **middlewares** dans `app/Http/Middleware`.
- Si un domaine grossit (plusieurs modèles, règles métier riches), passer à une organisation par domaine `app/Domain/<Contexte>/{Actions,Models,Events,DataTransferObjects}` (DDD léger). Ne pas le faire de manière préventive.
- Pas de logique dans les modèles hors relations, casts, scopes et accessors.
- Typage strict partout : types de retour PHP, `declare` de propriétés, TS `strict` sans `any`.
- Pages Inertia dans `resources/js/pages/<domaine>/<page>.tsx` (kebab-case). Layouts choisis dans `resources/js/app.tsx`.
- Composants shadcn dans `resources/js/components/ui` (ne pas éditer à la main, régénérer avec `npx shadcn add`). Composants applicatifs dans `resources/js/components`.
- Formulaires : composant `<Form>` d'Inertia + routes Wayfinder (`store.form()`), jamais d'URL en dur.
- Après ajout ou modification d'une route PHP : `php artisan wayfinder:generate --with-form` (fait automatiquement par Vite en dev).

## Tests : chaque fonction et composant est testé

- **PHP (Pest)** : `tests/Unit` pour Actions, DTOs, Events, Middlewares, factories (sans HTTP), `tests/Feature` pour routes, commandes, seeders, canaux de broadcast, auth, `tests/Architecture` pour les règles de code. `RefreshDatabase` est appliqué à `tests/Feature` via `tests/Pest.php`. Vite est désactivé dans `tests/TestCase.php`.
- **Fixtures** : chaque entité a sa factory (`database/factories`) avec des états nommés (`staff()`, `withTwoFactor()`), et un seeder dédié (`database/seeders/<Entité>Seeder.php`) appelé par `DatabaseSeeder` en local/testing uniquement. Côté front, l'équivalent vit dans `resources/js/test/fixtures/<entité>.ts` (`makeUser()`), à garder en miroir du seeder.
- Comptes de dev : `admin@admin.fr` et `admin2@admin.fr`, mot de passe `admin` (`StaffSeeder`). Jamais en production.
- **Front (Vitest)** : `resources/js/__tests__/` en miroir de `resources/js/` (`lib/`, `components/`, `hooks/`, `pages/`). Ne **jamais** poser un `*.test.tsx` dans `resources/js/pages/`, Inertia le bundlerait.
    - `<Head>` et `<Form>` d'Inertia sont mockés dans les tests de page (voir `__tests__/pages/auth/login.test.tsx`).
    - `ResizeObserver` est stubbé dans `resources/js/test/setup.ts` pour Radix.
- Toute nouvelle Action, événement, hook, composant ou page arrive avec ses tests dans le même commit.
- `make check` doit être vert avant de considérer une tâche terminée.

## Déploiement Laravel Cloud

1. Créer l'application sur [cloud.laravel.com](https://cloud.laravel.com) depuis ce dépôt Git, branche `main`.
2. **Build command** : `composer install --no-dev --optimize-autoloader && npm ci && npm run build`
3. **Deploy command** : `php artisan migrate --force && php artisan optimize`
4. Ressources à ajouter dans l'environnement : une base **Postgres** (ou MySQL), un **cache/queue** (Redis ou la queue database), un **worker de queue** (`php artisan queue:work`), et un **service Reverb** (ou un process `php artisan reverb:start --host=0.0.0.0 --port=8080` derrière le proxy Cloud si le service managé n'est pas disponible).
5. Variables d'environnement à définir :

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<domaine>
APP_KEY=                       # php artisan key:generate --show
DB_CONNECTION=pgsql            # injecté par Cloud si base attachée
QUEUE_CONNECTION=redis|database
CACHE_STORE=redis|database
SESSION_DRIVER=database
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=<id>
REVERB_APP_KEY=<clé>
REVERB_APP_SECRET=<secret>
REVERB_HOST=<domaine-reverb>
REVERB_PORT=443
REVERB_SCHEME=https
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

Les variables `VITE_*` sont lues **au build** : toute modification exige un redéploiement. 6. Créer le premier compte staff depuis la console Cloud : `php artisan staff:create --name=... --email=... --password=...` 7. Vérifier après déploiement : `/` redirige vers `/login`, l'en-tête `X-Robots-Tag: noindex` est présent, la connexion websocket (onglet Réseau, `wss://`) est établie une fois connecté.

## Ce qu'il ne faut pas faire

- Pas de page publique, pas de route sans `auth` (sauf celles de Fortify pour le login, 2FA, passkeys).
- Pas de réactivation de l'inscription ou du reset de mot de passe.
- Pas de logique métier dans les contrôleurs, commandes ou composants React.
- Pas de mutation côté backoffice sans `DashboardUpdated` (ou événement broadcast dédié).
- Pas de code sans test, pas de commit sans `make check` vert, pas de `--no-verify`.
- Pas de Repository au-dessus d'Eloquent, pas de couche Service en plus des Actions, pas de CQRS.

## Quand le projet grossit

- Passer à `app/Domain/<Contexte>/{Actions,Models,Events,Data,Policies}` dès que plus de deux modèles interagissent dans un même contexte.
- Remplacer `DashboardUpdated` par des événements métier nommés (`OrderShipped`) dès qu'un consommateur a besoin du payload.
- Générer les types TS depuis PHP (`spatie/laravel-typescript-transformer`) quand les props de page se multiplient.
- Observabilité : Laravel Pulse ou Nightwatch sur Laravel Cloud, `Log::withContext(['staff_id' => ...])` sur chaque requête.
