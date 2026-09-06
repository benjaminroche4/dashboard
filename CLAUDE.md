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
- **Noms de personnes toujours capitalisés** : tout prénom ou nom enregistré passe par `App\Support\PersonName::capitalize()` (initiale de chaque mot en majuscule, aussi après tiret ou apostrophe, reste en minuscules, espaces réduits) : `LeadData`, `DocumentRequestData` (personnes du foyer), `StaffMemberData`, `ProfileUpdateRequest` (`prepareForValidation`). Miroir front `capitalizeName()` dans `resources/js/lib/format.ts` pour les aperçus en direct. Le nom de client d'une facture (`client_name`, souvent une société) n'est **pas** normalisé.
- **Mot interdit : « staff »** dans tout texte visible (interface, e-mails, PDF, toasts, placeholders). Dire « l'équipe », « les membres », « le conseiller ». Le terme reste autorisé dans le code (identifiants, classes, canal `staff`, `StaffRole`, commentaires).

## Règles d'accès et SEO

- Toute route applicative est derrière le middleware `auth`. `/` redirige vers `login` ou `dashboard`.
- Registration, reset password et vérification email sont **désactivés** dans `config/fortify.php`. Ne pas les réactiver.
- 2FA, passkeys et confirmation de mot de passe restent actifs (côté authentifié uniquement).
- `App\Http\Middleware\NoIndex` est **global** (`$middleware->append`, pas seulement le groupe `web`) : `X-Robots-Tag: noindex, nofollow, noarchive` sur toutes les réponses, y compris `/up`, `/pulse`, `/storage` et les assets des paquets ; `public/robots.txt` bloque tout, le layout Blade porte `<meta name="robots" content="noindex">`. Ne jamais ajouter de sitemap, d'OpenGraph ni de meta SEO.

## Rôles et autorisations

- Enum `App\Enums\StaffRole` : `admin` > `manager` > `member` (colonne `users.role`, castée). Pour ajouter un rôle : un cas + son label + son rang dans l'enum, puis les règles dans les Policies.
- Helpers modèle : `$user->isAdmin()`, `$user->hasRole(...$roles)`, `$user->hasRoleAtLeast($role)`.
- **Policies** dans `app/Policies` (une par modèle, `final`, suffixe `Policy`). `UserPolicy` : seuls les admins gèrent le staff, chacun voit et modifie son propre profil, un admin ne peut ni se supprimer ni changer son propre rôle.
- **Middleware de route** `role:admin,manager` (`App\Http\Middleware\EnsureStaffRole`) pour restreindre une route entière. Pour une action précise, utiliser la Policy (`$this->authorize()` ou `Gate`).
- Gates transverses dans `AppServiceProvider::configureGates()` (ex. `viewPulse`).
- **Photo de profil** : `users.avatar_path` sur le disque `public` (dossier `avatars/`, nom de fichier aléatoire généré par `store()` : l'URL n'est pas devinable, ce qui suffit pour des portraits de l'équipe ; décision prise de ne pas passer par une route authentifiée pour ne pas dépendre d'un disque privé sur Cloud), accessor `User::avatar` (URL ou `null`, ajouté au JSON). Routes `profile.avatar.update` (POST, `AvatarUpdateRequest` : JPG/PNG/WebP, 2 Mo) et `profile.avatar.destroy`, actions `App\Actions\Settings\{UpdateProfileAvatar,RemoveProfileAvatar}`. Front : `AvatarUpload` (`resources/js/components/settings`) sur la page Profil, envoi immédiat en multipart. `php artisan storage:link` est lancé par `make install` ; sur Laravel Cloud, prévoir le lien dans la commande de déploiement ou un bucket pour le disque `public`.
- Le front reçoit `auth.user.role` et `auth.can.{manageStaff, viewPulse}` via `HandleInertiaRequests`. Toute nouvelle permission exposée au front s'ajoute là et dans le type `Permissions` de `resources/js/types/auth.ts`. Le front ne décide jamais seul : il masque, le backend refuse.

## Temps réel (obligatoire pour toute action du backoffice)

Quand un membre du staff fait une action, les autres membres connectés doivent la voir **sans refresh**.

1. Côté PHP, après la mutation, dispatcher `App\Events\DashboardUpdated::dispatch('<resource>', [...payload], 'a expédié la commande #42')`.
   L'événement embarque l'acteur (utilisateur connecté) et le message, et part sur le canal de présence `staff` (autorisation dans `routes/channels.php`), nom `dashboard.updated`. Le message est une phrase à la 3e personne sans sujet : le front la préfixe du nom de l'acteur.
2. Côté React, `<RealtimeStaff />` est monté une fois dans le header du layout authentifié : pour chaque événement reçu, il affiche un toast « Admin 2 a expédié la commande #42 » (ou « Vous (autre onglet) : … ») puis recharge les props Inertia de la page courante. L'onglet auteur de l'action est exclu **par socket** : `attachSocketIdToInertia()` (`resources/js/lib/socket-id.ts`, appelé dans `app.tsx`) ajoute l'en-tête `X-Socket-ID` à chaque visite Inertia et `DashboardUpdated` appelle `dontBroadcastToCurrentUser()`. Les autres onglets et navigateurs du même utilisateur reçoivent bien l'événement.
   Une page qui veut un rechargement ciblé ou une mise à jour optimiste appelle `useStaffChannel({ only: ['orders'], notify: false, onEvent })` (`resources/js/hooks/use-staff-channel.ts`).
3. `<OnlineStaff />` (header) affiche les avatars des membres connectés via `useOnlineStaff()` (canal de présence).
4. Créer un événement dédié seulement si le payload devient métier (ex. `OrderShipped`). Il doit alors implémenter `ShouldBroadcastNow` (ou `ShouldBroadcast` via la queue) et diffuser sur `PresenceChannel('staff')`.
5. `DashboardUpdated` est diffusé **immédiatement** (`ShouldBroadcastNow`, pas de queue) pour que les autres membres voient l'action sans délai. Un événement métier dédié peut rester en queue (`ShouldBroadcast`) s'il fait un travail lourd. En local, `.env` doit avoir `BROADCAST_CONNECTION=reverb` (avec `log`, rien n'est diffusé) et tout changement de `.env` lié à la diffusion demande de relancer `make start`.

Echo est configuré dans `resources/js/app.tsx` via `configureEcho({ broadcaster: 'reverb' })` et lit les variables `VITE_REVERB_*`.

## Factures (relocation à Paris)

- Société suisse : devises `CHF` ou `EUR` (`App\Enums\Currency`), TVA par défaut 8,1 %, coordonnées et prix par défaut dans `config/company.php` (surchargés par les variables `COMPANY_*` et `OFFER_*` de `.env`).
- Deux offres seulement : `App\Enums\Offer` (`accompagne`, `confie`). Une ligne de facture = offre + quantité + prix unitaire en centimes, la description est générée par l'enum.
- Création : `StoreInvoiceRequest` → `InvoiceData` / `InvoiceLineData` (totaux calculés dans le DTO) → `CreateInvoice` (numéro `RP-27NNN` séquentiel, transaction, première entrée d'historique, `DashboardUpdated`).
- Page `invoices/create` : formulaire `useForm` Inertia avec aperçu en direct (`InvoicePreview`), calcul des totaux partagé dans `resources/js/lib/invoice-totals.ts` avec les mêmes arrondis que le PHP. Le formulaire saisit des unités, le `transform` envoie des centimes.
- Liste `invoices/index` : Data Table shadcn (TanStack v8), 50 lignes par page, pagination masquée en dessous. **Actions groupées** : la Data Table accepte `bulkActions(rows, clearSelection)` rendu dans un îlot flottant `sticky bottom-4` centré sur le tableau dès qu'une ligne est cochée (compteur, actions, bouton Désélectionner) ; le numéro de facture est un lien vers la fiche ; `InvoiceBulkActions` (managers et admins seulement) propose « Envoyer (n) » et « Marquer payées (n) » avec le nombre d'éligibles (`can_send` / `can_pay`), routes `invoices.bulk-send` / `invoices.bulk-pay` (`BulkSendInvoicesRequest`, `BulkPayInvoicesRequest`, déclarées avant `invoices/{invoice}`), Actions `SendInvoices` / `MarkInvoicesPaid` qui délèguent à l'unité et renvoient les numéros traités et ignorés, résumés dans un toast (succès, ou avertissement listant les ignorées).
- **Lien lead ↔ facture** : `invoices.lead_id` (nullable, `Invoice::lead()`, `Lead::invoices()`). Route `invoices.link` (PATCH, `LinkInvoiceLeadRequest`, `LinkInvoiceToLead`, `lead_id` null pour détacher, note ajoutée au lead) ; recherche JSON `invoices.search` (numéro, client). Côté front : `InvoiceLeadLink` sur la page facture (lead rattaché, recherche via `leads.search`, détacher), `LeadInvoices` dans la section « Factures » de la fiche lead (liste, « Créer une facture » qui ouvre `invoices.create?lead=ID` avec `prefill` client/devise/formule et `lead_id` envoyé au `store`, « Lier une facture existante »). Managers et admins seulement.
- Droits : `InvoicePolicy`, tout le staff consulte, managers et admins créent et modifient, admins suppriment.
- **PDF** : route `invoices.pdf`, vue Blade `resources/views/invoices/pdf.blade.php` rendue puis envoyée à DocRaptor (`App\Services\DocRaptor`, clé `DOC_RAPTOR_KEY`, `DOC_RAPTOR_TEST_MODE=true` ajoute un filigrane sans facturation). Les tests simulent l'API avec `Http::fake`.
- **Adresse** : autocomplétion Google Places via le proxy Laravel (`PlacesController`, routes `places.suggest` et `places.details`, `App\Services\GooglePlaces`, clé serveur `GOOGLE_MAPS_API_KEY`, jamais exposée ; la clé navigateur `GOOGLE_MAPS_BROWSER_KEY` sert uniquement à la carte des arrondissements). Le front (`AddressAutocomplete`) reçoit `features.addressAutocomplete` en prop partagée ; sans clé, le champ est un simple texte.
- **Numéros de facture** : `config('company.invoice_prefix')` (`RP-27`, 27 = agent immobilier) + séquence à 3 chiffres minimum (`CreateInvoice::nextNumber()`), affiché à l'avance dans l'aperçu.
- **Cycle de vie** : `App\Enums\InvoiceStatus::transitions()` (brouillon → envoyée → payée, envoyée → en retard, tout sauf payée → annulée). Toujours passer par `Invoice::transitionTo()` : il refuse les transitions interdites et journalise dans `invoice_status_changes` (`InvoiceStatusChange`, affiché dans l'historique de la page `invoices/show`).
- **Envoi** : `SendInvoice` (route `invoices.send`) génère le PDF via DocRaptor si configuré, envoie le mailable `InvoiceSent` avec le PDF en pièce jointe au `client_email` (obligatoire), pose `sent_at` et passe en `sent`. **Paiement** : `MarkInvoicePaid` (route `invoices.pay`, `PayInvoiceRequest` avec `paid_at`). Le front expose `can_send` / `can_pay` par facture ; les boutons sont masqués sinon.
- **Retard automatique** : commande `invoices:mark-overdue` (`MarkOverdueInvoices`) planifiée chaque jour à 02:00 dans `routes/console.php`. Sur Laravel Cloud, activer le scheduler (`php artisan schedule:run` chaque minute).
- **Remise et acompte** : `discount_percent` (0–100, appliqué sur le sous-total HT avant TVA) et `deposit_cents` (déduit du total, « Reste à payer »). Les arrondis sont identiques dans `InvoiceData` et `resources/js/lib/invoice-totals.ts`.
- **Validation locale** : `validateInvoiceForm()` (même fichier) bloque l'envoi du formulaire et affiche les erreurs avec les mêmes clés que Laravel ; les erreurs serveur priment toujours.
- Les clés vivent dans `.env` (jamais commité). Sur Laravel Cloud, les ajouter aux variables d'environnement, `VITE_*` étant lues au build.
- **Fixtures** : `InvoiceFactory` (numéros `RP-27NNN` par compteur statique, états `status()`, `paid()`, `overdue()`), `InvoiceSeeder` (17 factures : 6 payées, 5 envoyées, 3 en retard, 2 brouillons, 1 annulée, chacune avec un auteur du staff dans `created_by`, testé par `tests/Feature/Database/InvoiceSeederTest.php`), côté front `resources/js/test/fixtures/invoice.ts` (`makeInvoice()`, `makeInvoiceDetail()`, `makeStatusChange()`). La page facture affiche « créée par [avatar] Admin le … » dans son sous-titre via le composant partagé `CreatedBy` (`resources/js/components/created-by.tsx` : avatar avec initiales en repli, nom, date ; les contrôleurs exposent `created_by_avatar` / `creator_avatar`), réutilisé sur la fiche d'une liste de documents.

## Leads (Converting Machine)

- Modèle `Lead` (`app/Models/Lead.php`), enums `LeadStatus` (`todo` À traiter, `in_progress` En cours, `quote_sent` Devis envoyé, `converted`, `archived` ; transitions libres) et `LeadSource`. Un lead porte : contact (nom, prénom, e-mail, téléphone avec indicatif via `PhoneInput`, société, langue `LeadLanguage`), formule `Offer`, source + `source_note` ; projet logement (budget mensuel en centimes + devise, emménagement `arrival_at`, arrondissements `districts` 1–20 choisis sur `DistrictMap` : carte Google Maps avec les contours réels cliquables (`GoogleDistrictMap`, `resources/js/lib/paris-arrondissements-geo.ts`, chargeur `resources/js/lib/google-maps.ts`) quand `features.googleMapsKey` est fournie (clé **navigateur** `GOOGLE_MAPS_BROWSER_KEY`, distincte de la clé serveur, restreinte par référent HTTP), sinon carte schématique (`resources/js/lib/paris-districts.ts`), `property_types` (`PropertyType`, multiple), `duration`, `guarantors` (`GuarantorType`, multiple), `furnished`, ville d'origine, note projet `message`) ; qualification (`score` 1 à 5, `recontact_channel` + `recontact_at`, `qualification_note`). Les enums exposent `options()` pour les listes du formulaire.
- **Kanban** (`LeadKanban`, dnd-kit : souris, tactile, clavier) : une colonne par statut avec totaux (budgets par devise, note moyenne), ordre manuel via `leads.position` (`UpdateLeadStatus` renumérote les colonnes, `CreateLead` place en tête de « À traiter »), colonne Archivé repliée par défaut (état dans `localStorage`), filtres et tris purs dans `resources/js/lib/kanban.ts` (`applyMove`, `filterLeads`, `columnStats`). Hors tri manuel, le glisser change de colonne mais pas d'ordre. À l'arrivée dans une autre colonne, la carte joue `animate-lead-land` (halo de la couleur de la colonne, sans rebond, défini dans `app.css`) ; désactivé avec `prefers-reduced-motion`.
- **Sur le kanban** : volet d'aperçu (`LeadPreviewSheet`, JSON `leads.preview`, notes et historique sans quitter le tableau), attribution (`LeadAssignMenu`, `leads.assign`, `AssignLead` ; filtre par avatars des responsables ayant des leads dans `LeadFilterBar`, moi en premier, plus « Non attribués » ; offre, note et tri dans le popover « Filtres » avec compteur de filtres actifs), indicateurs d'urgence calculés côté front (`resources/js/lib/lead-urgency.ts` : 3 j sans contact = orange, 7 j = rouge, arrivée sous 30 jours), animation d'entrée des cartes qui apparaissent (`animate-lead-enter`, fondu sans halo).
- **Fiche** `leads/show` : coordonnées cliquables, projet, message, notes internes (`LeadNote`, `AddLeadNote`, route `leads.notes.store`) et historique (`LeadStatusChange`, journalisé par `CreateLead` et `UpdateLeadStatus`). **Modification** : `leads/{lead}/edit` réutilise la page `leads/create` avec la prop `lead` (`UpdateLead`, `UpdateLeadRequest`). Recherche ⌘K : `leads.search` (JSON, throttle 60/min) interrogée par `SearchCommand` dès deux caractères.
- **Fiche, suite** : référence publique `LD-XXXX` (`GenerateLeadReference`, colonne `leads.reference` unique, générée par `CreateLead`, affichée dans l'en-tête avec copie) ; bandeau de chiffres clés (`LeadShowBody`) ; carte « Suivi par » avec prochain recontact (`LeadRecontact`, route `leads.recontact`, `ScheduleLeadRecontact`), dernier contact (`leads.contact`, `TouchLeadContact`), « Envoyer au lead » puis proposition « Passer en Devis envoyé » ; fil d'activité unifié (`LeadActivity` : notes en bulles shadcn Message/Bubble, envois au lead, changements de statut, filtres Tout/Notes/Envois/Statuts) ; notes modifiables et supprimables par leur auteur pendant 15 min, par les admins toujours (`LeadNotePolicy`, `UpdateLeadNote`, `DeleteLeadNote`, routes `leads.notes.update` / `leads.notes.destroy`) ; mentions `@Prénom Nom` proposées par `LeadNoteComposer` (⌘/Ctrl+Entrée envoie), détectées par `AddLeadNote` (payload `mentions`) et signalées par un toast dédié dans `useStaffChannel` ; alerte doublons (prop `duplicates`, même requête que `leads.duplicates`) ; menu « ⋯ » (`LeadHeaderMenu` : archiver, supprimer pour les admins via `leads.destroy` / `DeleteLead`) ; palier de budget par quartier (`budgetTier`, `resources/js/lib/paris-budget.ts`).
- **Motif de perte** : à l'archivage (menu de statut, dépôt dans la colonne Archivé, menu « ⋯ »), `LeadArchiveDialog` demande un motif `LeadLossReason` (obligatoire, `required_if` dans `UpdateLeadStatusRequest`) et une précision libre ; `UpdateLeadStatus` les pose sur `leads.loss_reason` / `loss_note` et les efface quand le lead sort d'Archivé ; la fiche affiche « Motif : … » à côté du statut. Les pages leads reçoivent `lossReasons`.
- **Rappels de recontact** : commande `leads:remind-recontacts` (`SendRecontactReminders`) planifiée chaque jour à 08:00 : à chaque responsable, un e-mail `RecontactsDue` (vue `emails.leads.recontacts`) listant ses recontacts du jour et en retard, plus un `DashboardUpdated` avec `mentions` pour le toast ciblé.
- **Recherche** : ⌘K (`leads.search`) et le filtre texte du kanban (`filterLeads`) cherchent aussi la référence `LD-XXXX`, la société et la ville d'origine ; les résultats ⌘K affichent référence et société.
- **Temps réel ciblé** : une page peut déclarer `realtimeOnly` (liste de props) dans ses props Inertia ; `useStaffChannel` ne recharge alors que celles-ci (`leads/index` → `['leads']`). Le volet d'aperçu du kanban et la route `leads.preview` ont été supprimés : le clic sur une carte ouvre la fiche.
- Deux entrées dans la sidebar sous **Leads** : « Kanban des leads » (`leads/index`, `LeadKanban` : une colonne par statut, glisser-déposer natif HTML5 avec mise à jour optimiste, badge `LeadStatusMenu` sur chaque carte pour le clavier et le mobile ; les deux passent par la route `leads.status`, PATCH) et « Converting Machine » (`leads/create`, formulaire en trois panneaux numérotés avec, à droite, le **passeport du lead** `LeadPassport` : aperçu en direct et jauge de complétude sur dix champs clés ; validation locale `validateLeadForm` avant envoi avec focus sur le premier champ en erreur ; détection des doublons par e-mail ou téléphone via `leads.duplicates` ; alerte « Budget serré » sous 1 300 € par mois (`isTightBudget`, `resources/js/lib/paris-budget.ts`) ; « Suivi par » pré-rempli avec l'utilisateur courant ; ⌘/Ctrl+Entrée enregistre, Échap annule). Pas de page publique : la règle « seul `/login` est public » reste vraie.
- Flux : `StoreLeadRequest` (nom + prénom obligatoires, e-mail **ou** téléphone) → `LeadData` → `CreateLead` (statut `new`, `DashboardUpdated`). Changement de statut : `UpdateLeadStatusRequest` → `UpdateLeadStatus` (date `last_contacted_at`, `DashboardUpdated`).
- **Envoi au lead** (bouton « Envoyer au lead » sur la fiche, `LeadSendDialog`) : une modale avec trois cases, récapitulatif du dossier, lien de paiement et lien du contrat (`App\Enums\LeadMailItem`). Route `leads.send` → `SendLeadDossierRequest` → `SendLeadDossier` : lien de paiement = Stripe Payment Link préparé dans Stripe, choisi par formule, modalité (`App\Enums\PaymentPlan` : totalité ou acompte de 50 %, Confié seulement) et langue du lead dans `config/company.php` `payment_links` (`App\Services\PaymentLinks`), contrat PDF rendu par `resources/views/contracts/lead.blade.php` puis DocRaptor, signé via Yousign v3 (`App\Services\Yousign`, `YOUSIGN_API_KEY`, sandbox par défaut avec `YOUSIGN_BASE_URL`). Un seul mailable `LeadDossierSent` (`emails/leads/dossier`, **même charte que l'e-mail de récap du site Relocation In Paris** : logo, blocs gris arrondis, pastilles bordeaux, carte statique Google des arrondissements via `App\Services\DistrictStaticMap` et `App\Support\ParisArrondissements`, conseiller avec WhatsApp, étapes, bouton bordeaux ; identité dans `config/company.php` `mail`, style de carte `GOOGLE_STATIC_MAP_ID`), **optimisé pour l'ouverture** : sujet personnalisé par le prénom et par le contenu (`subjectLine()`), ligne de prévisualisation adaptée (`preheader()`), expéditeur = **l'adresse du conseiller** (« Charles · Relocation in Paris », `charles@…`) si son domaine est dans `company.mail.sender_domains` (vérifiés chez Resend), sinon l'adresse de contact ; « Répondre à » toujours vers le conseiller quand le lead est attribué ; envoyé **dans la langue de contact du lead** (`Mail::to()->locale($lead->language->value)`, chaînes `__()` traduites dans `lang/en.json`, dates formatées avec la locale du mailable), l'envoi est journalisé en note du lead et met à jour `last_contacted_at`. La fiche reçoit `sending.{email, paymentLink, contractLink}` pour griser ce qui n'est pas configuré ; les tests simulent Yousign et DocRaptor avec `Http::fake`.
- **Visio** (bouton « Programmer une visio » dans le bloc « Suivi par », `LeadVisioDialog` : modale avec un champ date-heure, heure de Paris, créneau proposé le prochain jour ouvré à 10h) : route `leads.visio` → `ScheduleLeadVisioRequest` → `ScheduleLeadVisio`, même mécanisme que le site RIP. Événement Google Calendar de 20 min avec lien Meet créé dans l'agenda du conseiller (compte de service Workspace avec délégation, `App\Services\GoogleCalendar`, `GOOGLE_CALENDAR_KEY_FILE` chemin ou JSON base64, `GOOGLE_CALENDAR_ORGANIZER` central), puis e-mail `LeadVisioScheduled` au lead dans sa langue (charte du site, invitation ICS jointe via `App\Support\IcsInvite`, liens Google/Outlook, lien Meet). Colonnes `leads.visio_at`, `visio_event_id`, `visio_meet_link` ; le recontact passe en `visio`. Sans Google Calendar, l'ICS seule part. Le mot « visio » n'apparaît jamais côté client (« appel vidéo »).
- Droits : `LeadPolicy`, tout le staff consulte, crée et fait avancer ; seuls les admins suppriment.
- Fixtures : `LeadFactory` (états `status()`, `converted()`), `LeadSeeder`, côté front `resources/js/test/fixtures/lead.ts`.

## Outils (sidebar : menu dépliable « Outils » → « Documents », page `tools/index`)

Page `tools/index` (route `tools.index`, libellé « Outils » du menu) : une carte par outil sur fond `bg-sidebar` avec une seule bordure (jamais de double cadre), icône à gauche du titre, un seul bouton en bas à droite (« Liste de documents » → « Voir les demandes », liste des demandes) ; le sous-lien « Documents » mène à la liste des demandes (`tools.documents.index`). Premier outil : **Documents**.

- **Liste de documents** : l'équipe génère un PDF listant les pièces à fournir **par personne du foyer**, avec le lien sécurisé (Drive, etc.) où le client les déposera. Aucune page publique de dépôt : le lien est fourni par l'équipe. **PDF seulement** : aucun envoi par e-mail (pas de champ e-mail, pas de colonne `sent_at`, pas de mailable ni de route d'envoi). Si l'envoi revient un jour, le faire comme `SendInvoice`.
- Modèle `DocumentRequest` (`document_requests` : prénom, nom **= première personne du foyer** (recopiés par `DocumentRequestData`, **toujours capitalisés** via `App\Support\PersonName::capitalize()` : initiale de chaque mot en majuscule, reste en minuscules, miroir front `capitalizeName()` dans `resources/js/lib/format.ts` utilisé par `personName()`), `language` `LeadLanguage`, `message`, `upload_url` https, `persons` JSON 1 à 4 `{first_name, last_name, role, documents}`, `created_by`, `lead_id` nullable). **Lien lead ↔ liste** : `DocumentRequest::lead()`, `Lead::documentRequests()` ; `tools.documents.create?lead=ID` reçoit `prefill` (lead, première personne, langue) et `lead_id` part avec le `store` ; la fiche lead reçoit `documentRequests` et affiche la section « Documents » (`LeadDocumentRequests` : liste + « Créer une liste de documents ») ; la fiche d'une liste affiche un panneau « Lead », la liste des listes la mention « Lead : … ». `RenderDocumentRequestPdf::persons()` renvoie par personne `name` (repli « Personne n » si vide), `role` et `categories` (pièces regroupées par catégorie dans l'ordre du catalogue, libellés traduits) pour le PDF, l'e-mail et la fiche. Enums `HouseholdRole` (`tenant` Locataire, `guarantor` Garant) et `DocumentCategory` (Études, Finance, Garantie, Logement, Identité, Autres, Travail). **Catalogue des pièces administrable** : table `catalog_documents` (`CatalogDocument` : `key` stable référencée par les listes, `category`, `label`/`hint` FR, `label_en`/`hint_en`, `position`), remplie par la migration de création depuis `DocumentCatalog::defaults()` (58 pièces, traductions reprises de `lang/en.json`). `App\Support\DocumentCatalog` lit la table avec un cache statique par requête (`flush()` après écriture, vidé dans `tests/TestCase.php`) : `all()`, `keys()`, `has()`, `label()`/`hint()` selon la locale (clé brute si la pièce a disparu), `grouped()` pour le formulaire, `administrable()` pour la page de gestion. **Gestion** (admins, `CatalogDocumentPolicy`) : page `documents/catalog` (`CatalogDocumentController`, routes `tools.documents.catalog.{index,store,update,destroy}` déclarées avant `tools/documents/{documentRequest}`), ouverte depuis le menu « ⋯ » de la liste des demandes (« Modifier les pièces ») ; `CatalogDocumentDialog` pour ajouter ou modifier (catégorie, libellés, aides FR/EN), suppression avec confirmation ; Actions `CreateCatalogDocument` (clé snake_case unique dérivée du libellé, fin de catégorie), `UpdateCatalogDocument` (clé immuable, fin de la nouvelle catégorie si elle change), `DeleteCatalogDocument` ; `CatalogDocumentData`, `Store/UpdateCatalogDocumentRequest`, factory `CatalogDocumentFactory`, fixture front `resources/js/test/fixtures/catalog-document.ts`.
- Flux : `StoreDocumentRequestRequest` → `DocumentRequestData` → `CreateDocumentRequest` (`DashboardUpdated` ressource `documents`). PDF : `RenderDocumentRequestPdf` (vue `documents/request.blade.php`, rendue dans la langue du client, DocRaptor).
- Routes `tools.documents.{index,create,store,show,pdf,edit,update,destroy,bulk-destroy}` (`DocumentRequestController`), `DocumentRequestPolicy` (toute l'équipe consulte, crée et modifie ; admins suppriment). **Modification** : `documents/{id}/edit` réutilise la page `documents/create` avec la prop `request` (`UpdateDocumentRequestRequest` → `UpdateDocumentRequest`) ; **suppression** : `DeleteDocumentRequest`, admins seulement.
- Front : `documents/create` (**une personne affichée à la fois** : la carte « Personnes du foyer n/4 max » à droite est la seule navigation (boutons avec nom, rôle, état, `aria-current`, contour rouge si erreur), la personne ajoutée devient active ; `HouseholdPersonCard` par personne : en-tête = nom saisi avec surtitre « Personne 2 sur 3 » (ou seulement « Personne n » sans nom), prénom et nom obligatoires, rôle, pièces par catégorie avec icône Lucide (`resources/js/lib/document-category-icons.ts`), lignes de même hauteur (`auto-rows-fr`) et bouton « Tous » qui devient « Décocher » une fois la catégorie complète ; puis section « Message et lien de dépôt » avec la langue du PDF en deux boutons radio à drapeaux (`CountryFlag`) ; validation locale `validateDocumentRequestForm` dans `resources/js/lib/document-request-form.ts`, qui affiche la première personne en erreur avant de faire défiler ; bouton « Créer la demande »), `documents/index` (**même Data Table que les factures** : `DataTable` frame `panel`, colonnes `resources/js/components/documents/columns.tsx`, filtre par client, menu « ⋯ » `DocumentRequestRowActions` : voir, modifier, PDF, supprimer pour les admins avec confirmation ; **aucune colonne ni compteur de statut d'envoi** ; actions groupées `DocumentRequestBulkActions` = suppression seulement, admins, rien d'affiché pour les autres), `documents/show` (une carte repliable par personne `HouseholdPersonPanel` : nom, rôle et nombre de pièces restent visibles repliés, pièces regroupées par catégorie avec icône et pastille de compte sur fond blanc, boutons « Modifier », « Télécharger le PDF » via `downloadDocumentRequestPdf` et le même menu « ⋯ »). Fixtures : `DocumentRequestFactory`, `DocumentRequestSeeder`, `resources/js/test/fixtures/document-request.ts`.

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
SESSION_SECURE_COOKIE=true      # facultatif : déjà vrai par défaut quand APP_ENV=production (config/session.php)
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
