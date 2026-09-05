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
php artisan staff:create --name="Nom" --email=nom@exemple.com --role=admin|manager|member
```

## Langue : tout en français

- `APP_LOCALE=fr`, `APP_FALLBACK_LOCALE=fr`. Les traductions Laravel (validation, auth, passwords, Fortify) viennent de `laravel-lang/common` (`php artisan lang:update` après une montée de version). Les chaînes applicatives passent par `__('...')` avec leur traduction dans `lang/fr.json`.
- Tout texte affiché dans le front (libellés, placeholders, titres `<Head>`, `aria-label`, toasts, messages d'erreur) est écrit directement en français, vouvoiement. Le nom du produit reste « Dashboard ».
- Les tests assertent les textes français.

## Règles d'accès et SEO

- Toute route applicative est derrière le middleware `auth`. `/` redirige vers `login` ou `dashboard`.
- Registration, reset password et vérification email sont **désactivés** dans `config/fortify.php`. Ne pas les réactiver.
- 2FA, passkeys et confirmation de mot de passe restent actifs (côté authentifié uniquement).
- `App\Http\Middleware\NoIndex` ajoute `X-Robots-Tag: noindex` sur toutes les réponses web, `public/robots.txt` bloque tout, le layout Blade porte `<meta name="robots" content="noindex">`. Ne jamais ajouter de sitemap, d'OpenGraph ni de meta SEO.

## Rôles et autorisations

- Enum `App\Enums\StaffRole` : `admin` > `manager` > `member` (colonne `users.role`, castée). Pour ajouter un rôle : un cas + son label + son rang dans l'enum, puis les règles dans les Policies.
- Helpers modèle : `$user->isAdmin()`, `$user->hasRole(...$roles)`, `$user->hasRoleAtLeast($role)`.
- **Policies** dans `app/Policies` (une par modèle, `final`, suffixe `Policy`). `UserPolicy` : seuls les admins gèrent le staff, chacun voit et modifie son propre profil, un admin ne peut ni se supprimer ni changer son propre rôle.
- **Middleware de route** `role:admin,manager` (`App\Http\Middleware\EnsureStaffRole`) pour restreindre une route entière. Pour une action précise, utiliser la Policy (`$this->authorize()` ou `Gate`).
- Gates transverses dans `AppServiceProvider::configureGates()` (ex. `viewPulse`).
- Le front reçoit `auth.user.role` et `auth.can.{manageStaff, viewPulse}` via `HandleInertiaRequests`. Toute nouvelle permission exposée au front s'ajoute là et dans le type `Permissions` de `resources/js/types/auth.ts`. Le front ne décide jamais seul : il masque, le backend refuse.

## Temps réel (obligatoire pour toute action du backoffice)

Quand un membre du staff fait une action, les autres membres connectés doivent la voir **sans refresh**.

1. Côté PHP, après la mutation, dispatcher `App\Events\DashboardUpdated::dispatch('<resource>', [...payload], 'a expédié la commande #42')`.
   L'événement embarque l'acteur (utilisateur connecté) et le message, et part sur le canal de présence `staff` (autorisation dans `routes/channels.php`), nom `dashboard.updated`. Le message est une phrase à la 3e personne sans sujet : le front la préfixe du nom de l'acteur.
2. Côté React, `<RealtimeStaff />` est monté une fois dans le header du layout authentifié : pour chaque événement d'un **autre** membre, il affiche un toast « Admin 2 a expédié la commande #42 » puis recharge les props Inertia de la page courante. Les événements de l'utilisateur courant sont ignorés.
   Une page qui veut un rechargement ciblé ou une mise à jour optimiste appelle `useStaffChannel({ only: ['orders'], notify: false, onEvent })` (`resources/js/hooks/use-staff-channel.ts`).
3. `<OnlineStaff />` (header) affiche les avatars des membres connectés via `useOnlineStaff()` (canal de présence).
4. Créer un événement dédié seulement si le payload devient métier (ex. `OrderShipped`). Il doit alors implémenter `ShouldBroadcast` et diffuser sur `PresenceChannel('staff')`.
5. Les événements passent par la **queue** : `make start` lance `queue:listen`. En prod, Laravel Cloud doit avoir un worker.

Echo est configuré dans `resources/js/app.tsx` via `configureEcho({ broadcaster: 'reverb' })` et lit les variables `VITE_REVERB_*`.

## Factures (relocation à Paris)

- Société suisse : devises `CHF` ou `EUR` (`App\Enums\Currency`), TVA par défaut 8,1 %, coordonnées et prix par défaut dans `config/company.php` (surchargés par les variables `COMPANY_*` et `OFFER_*` de `.env`).
- Deux offres seulement : `App\Enums\Offer` (`accompagne`, `confie`). Une ligne de facture = offre + quantité + prix unitaire en centimes, la description est générée par l'enum.
- Création : `StoreInvoiceRequest` → `InvoiceData` / `InvoiceLineData` (totaux calculés dans le DTO) → `CreateInvoice` (numéro `RP-27NNN` séquentiel, transaction, première entrée d'historique, `DashboardUpdated`).
- Page `invoices/create` : formulaire `useForm` Inertia avec aperçu en direct (`InvoicePreview`), calcul des totaux partagé dans `resources/js/lib/invoice-totals.ts` avec les mêmes arrondis que le PHP. Le formulaire saisit des unités, le `transform` envoie des centimes.
- Liste `invoices/index` : Data Table shadcn (TanStack v8), 50 lignes par page, pagination masquée en dessous.
- Droits : `InvoicePolicy`, tout le staff consulte, managers et admins créent et modifient, admins suppriment.
- **PDF** : route `invoices.pdf`, vue Blade `resources/views/invoices/pdf.blade.php` rendue puis envoyée à DocRaptor (`App\Services\DocRaptor`, clé `DOC_RAPTOR_KEY`, `DOC_RAPTOR_TEST_MODE=true` ajoute un filigrane sans facturation). Les tests simulent l'API avec `Http::fake`.
- **Adresse** : autocomplétion Google Places via le proxy Laravel (`PlacesController`, routes `places.suggest` et `places.details`, `App\Services\GooglePlaces`, clé serveur `GOOGLE_MAPS_API_KEY`, jamais exposée). Le front (`AddressAutocomplete`) reçoit `features.addressAutocomplete` en prop partagée ; sans clé, le champ est un simple texte.
- **Numéros de facture** : `config('company.invoice_prefix')` (`RP-27`, 27 = agent immobilier) + séquence à 3 chiffres minimum (`CreateInvoice::nextNumber()`), affiché à l'avance dans l'aperçu.
- **Cycle de vie** : `App\Enums\InvoiceStatus::transitions()` (brouillon → envoyée → payée, envoyée → en retard, tout sauf payée → annulée). Toujours passer par `Invoice::transitionTo()` : il refuse les transitions interdites et journalise dans `invoice_status_changes` (`InvoiceStatusChange`, affiché dans l'historique de la page `invoices/show`).
- **Envoi** : `SendInvoice` (route `invoices.send`) génère le PDF via DocRaptor si configuré, envoie le mailable `InvoiceSent` avec le PDF en pièce jointe au `client_email` (obligatoire), pose `sent_at` et passe en `sent`. **Paiement** : `MarkInvoicePaid` (route `invoices.pay`, `PayInvoiceRequest` avec `paid_at`). Le front expose `can_send` / `can_pay` par facture ; les boutons sont masqués sinon.
- **Retard automatique** : commande `invoices:mark-overdue` (`MarkOverdueInvoices`) planifiée chaque jour à 02:00 dans `routes/console.php`. Sur Laravel Cloud, activer le scheduler (`php artisan schedule:run` chaque minute).
- **Remise et acompte** : `discount_percent` (0–100, appliqué sur le sous-total HT avant TVA) et `deposit_cents` (déduit du total, « Reste à payer »). Les arrondis sont identiques dans `InvoiceData` et `resources/js/lib/invoice-totals.ts`.
- **Validation locale** : `validateInvoiceForm()` (même fichier) bloque l'envoi du formulaire et affiche les erreurs avec les mêmes clés que Laravel ; les erreurs serveur priment toujours.
- Les clés vivent dans `.env` (jamais commité). Sur Laravel Cloud, les ajouter aux variables d'environnement, `VITE_*` étant lues au build.

## Leads (Converting Machine)

- Modèle `Lead` (`app/Models/Lead.php`), enums `LeadStatus` (`todo` À traiter, `in_progress` En cours, `quote_sent` Devis envoyé, `converted`, `archived` ; transitions libres) et `LeadSource`. Un lead porte contact, offre visée, date d'arrivée, budget mensuel en centimes + devise, ville d'origine, source, message, qualité `score` (1 à 5, étoile sur la carte).
- **Kanban** (`LeadKanban`, dnd-kit : souris, tactile, clavier) : une colonne par statut avec totaux (budgets par devise, note moyenne), ordre manuel via `leads.position` (`UpdateLeadStatus` renumérote les colonnes, `CreateLead` place en tête de « À traiter »), colonne Archivé repliée par défaut (état dans `localStorage`), filtres et tris purs dans `resources/js/lib/kanban.ts` (`applyMove`, `filterLeads`, `columnStats`). Hors tri manuel, le glisser change de colonne mais pas d'ordre. À l'arrivée dans une autre colonne, la carte joue `animate-lead-land` (halo de la couleur de la colonne, défini dans `app.css`) et le compteur `animate-count-bump` ; désactivés avec `prefers-reduced-motion`.
- **Sur le kanban** : sélection multiple (case au survol de l'avatar, barre flottante → `leads.bulk-status`, `BulkUpdateLeadStatus`), volet d'aperçu (`LeadPreviewSheet`, JSON `leads.preview`, notes et historique sans quitter le tableau), attribution (`LeadAssignMenu`, `leads.assign`, `AssignLead`, filtre « Mes leads »), indicateurs d'urgence calculés côté front (`resources/js/lib/lead-urgency.ts` : 3 j sans contact = orange, 7 j = rouge, arrivée sous 30 jours), animation d'entrée des cartes ajoutées à distance (`animate-lead-enter`).
- **Fiche** `leads/show` : coordonnées cliquables, projet, message, notes internes (`LeadNote`, `AddLeadNote`, route `leads.notes.store`) et historique (`LeadStatusChange`, journalisé par `CreateLead` et `UpdateLeadStatus`). **Modification** : `leads/{lead}/edit` réutilise la page `leads/create` avec la prop `lead` (`UpdateLead`, `UpdateLeadRequest`). Recherche ⌘K : `leads.search` (JSON, throttle 60/min) interrogée par `SearchCommand` dès deux caractères.
- Deux entrées dans la sidebar sous **Leads** : « Kanban des leads » (`leads/index`, `LeadKanban` : une colonne par statut, glisser-déposer natif HTML5 avec mise à jour optimiste, badge `LeadStatusMenu` sur chaque carte pour le clavier et le mobile ; les deux passent par la route `leads.status`, PATCH) et « Converting Machine » (`leads/create`, formulaire de qualification saisi par le staff). Pas de page publique : la règle « seul `/login` est public » reste vraie.
- Flux : `StoreLeadRequest` (nom + prénom obligatoires, e-mail **ou** téléphone) → `LeadData` → `CreateLead` (statut `new`, `DashboardUpdated`). Changement de statut : `UpdateLeadStatusRequest` → `UpdateLeadStatus` (date `last_contacted_at`, `DashboardUpdated`).
- Droits : `LeadPolicy`, tout le staff consulte, crée et fait avancer ; seuls les admins suppriment.
- Fixtures : `LeadFactory` (états `status()`, `converted()`), `LeadSeeder`, côté front `resources/js/test/fixtures/lead.ts`.

## Architecture et conventions

Ces règles sont **vérifiées par `tests/Architecture/ArchitectureTest.php`** (pest-plugin-arch). Une violation casse la suite.

- `declare(strict_types=1)` dans tout `app/`. Pas de `dd`, `dump`, `env()` hors `config/`.
- `config/pulse.php` et la migration Pulse sont publiés par le package : exclus de Rector et PHPStan, ne pas les retoucher.
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
- **Toasts** : composant shadcn `Toast` (Base UI, `resources/js/components/ui/toast.tsx`, `<Toaster />` monté dans `app.tsx`). Ne jamais appeler le gestionnaire directement : passer par `notify` (`resources/js/lib/toast.ts`) : `notify.success/info/warning/error(titre, description?)`, et pour une opération longue `const id = notify.loading(...)` puis `notify.resolve(id, ...)` ou `notify.reject(id, ...)` qui font évoluer le même toast. Les tests mockent `@/lib/toast`.
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

Les variables `VITE_*` sont lues **au build** : toute modification exige un redéploiement. 6. Créer le premier compte staff depuis la console Cloud : `php artisan staff:create --name=... --email=... --password=...` 7. Pulse : `PULSE_ENABLED=true` (défaut), et une entrée scheduler ou un process `php artisan pulse:check` pour les collecteurs serveur. Le dashboard `/pulse` est réservé aux admins (gate `viewPulse`). 8. Vérifier après déploiement : `/` redirige vers `/login`, l'en-tête `X-Robots-Tag: noindex` est présent, la connexion websocket (onglet Réseau, `wss://`) est établie une fois connecté.

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
