<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\DossierBriefData;
use App\Enums\DossierSection;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\User;
use App\Services\Assistant;
use App\Support\DossierPlan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Fait rédiger par l'assistant la synthèse du dossier fusionné : une **fiche
 * récapitulative par partie** (identité, situation professionnelle, salaires,
 * impôts, épargne…), chacune lue sur les pièces validées de la partie, puis
 * la **page de garde** qui présente le foyer d'après ces fiches et le projet.
 *
 * Ne tourne que sur un dossier **complet** — chaque pièce demandée validée —
 * pour que ce qui part chez une agence soit entier. Une partie que
 * l'assistant ne sait pas lire (fichiers trop lourds, panne) garde sa fiche
 * sans résumé : la liste des pièces y est, le dossier part quand même.
 *
 * @phpstan-import-type SectionBrief from DossierBriefData
 * @phpstan-import-type Cover from DossierBriefData
 */
final readonly class GenerateDossierBrief
{
    /** Au-delà, la partie n'est pas envoyée à l'assistant : l'API refuse les requêtes trop lourdes. */
    public const int MAX_SECTION_BYTES = 28_000_000;

    /**
     * Forme des valeurs, commune aux fiches et à la page de garde : le même
     * chiffre doit s'écrire pareil sur la carte, dans le profil et dans la fiche.
     */
    private const string FORMAT_RULES = <<<'TXT'
Forme des valeurs, à respecter partout :
- Montants en euros, arrondis à l'euro supérieur (2 499,20 € devient 2 500 €), jamais de centimes, espace comme séparateur de milliers et espace avant le symbole : « 4 150 € », « 30 000 € ». Un salaire se précise « nets par mois » (« 2 500 € nets par mois ») ; une épargne, un revenu fiscal ou un solde s'écrivent sans unité de temps.
- Un total ou une moyenne se calcule sur les valeurs exactes des pièces, puis s'arrondit à l'euro supérieur une seule fois.
- Dates en toutes lettres, sans zéro initial : « 3 mars 2026 » ; un mois seul « juin 2026 » ; une période « de juin à août 2026 » ; une ancienneté « depuis mars 2021 ». Jamais de format numérique (03/03/2026).
- Pourcentages en nombre entier (« 28 % »), rapports au loyer avec une décimale (« 3,2 fois le loyer »), nombre de parts tel qu'il est écrit sur l'avis (« 2,5 parts »).
- Un revenu fiscal de référence s'écrit « RFR 2025 : 29 400 € », avec l'année de l'avis.
- Un même chiffre garde la même écriture d'un texte à l'autre : ne reformule jamais une valeur déjà donnée dans une fiche, recopie-la telle quelle.
TXT;

    private const string SECTION_SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris qui monte des dossiers de location pour ses clients, souvent étrangers ou en mutation.
On te donne les pièces justificatives d'une partie du dossier d'une personne (par exemple ses bulletins de salaire, ou ses avis d'imposition). Rédige la fiche récapitulative qui ouvrira cette partie dans le dossier remis à une agence immobilière ou à un propriétaire, qui doit la lire en quelques secondes.
Règles :
- N'écris que ce que tu lis sur les pièces. Aucun chiffre, aucune date, aucun nom qui n'y figure pas.
- Calcule les moyennes et totaux utiles (revenu net mensuel moyen, épargne totale) à partir des pièces, en disant sur quelle période.
- Très condensé : un résumé d'une phrase, deux à quatre faits, une ligne par fichier. Droit aux chiffres, sans phrase d'accompagnement.
- La fiche met le dossier en valeur : elle ne retient que ce qui joue en sa faveur, sans réserve, sans point d'attention, sans jugement. Une information neutre ou défavorable, ou qui ne se lit pas sur les pièces, n'est simplement pas écrite.
- Ton neutre et factuel, à la troisième personne, en français. Pas de formule d'introduction ni de conclusion. Aucun tiret long (—) dans les textes.
TXT;

    private const string COVER_SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. Elle remet le dossier de location d'un de ses clients à une agence immobilière ou à un propriétaire, qui reçoit beaucoup de dossiers et tranche en quelques secondes.
Rédige le profil qui ouvre ce dossier : les informations clés sur les locataires, droit au but, d'après les fiches récapitulatives de chaque partie (établies sur des pièces vérifiées par l'agence) et le projet du client.
Forme du résumé (300 à 600 caractères en tout) :
- Une ou deux phrases par locataire, qui enchaînent les faits sans détour : prénom et nom, situation (contrat, employeur, ancienneté), revenu net mensuel, épargne, revenu fiscal de référence. Exemple : « Bernard Gange est en CDI chez Axa depuis 2019 et gagne 2 500 € nets par mois. Il dispose de 30 000 € d'épargne et son revenu fiscal de référence 2025 est de 29 400 €. »
- Une phrase pour le foyer, seulement si elle apporte un chiffre : revenus cumulés, « plus de trois fois le loyer » si c'est vrai, garant et son revenu, emménagement souhaité.
Règles :
- Uniquement des faits lus sur les fiches ou le projet : aucune invention, aucune estimation, aucun adjectif, aucun superlatif, aucune phrase d'accompagnement.
- Ne retiens que ce qui joue en faveur du dossier. Une information neutre ou défavorable (période d'essai, contrat court, revenu modeste, impôt faible, titre de séjour à renouveler, pièce manquante) n'est pas écrite. Ce qui n'est pas établi n'est pas écrit. Tu n'écris jamais que le dossier est complet.
- Les points forts sont trois à cinq lignes courtes, chacune un chiffre ou un fait, sans répéter mot pour mot le résumé.
- Les trois cartes (salaires, imposition, épargne) reprennent les chiffres des fiches, recopiés tels qu'ils y sont écrits : le total du foyer en valeur, et une ligne par locataire dans la répartition quand le foyer compte deux locataires (les garants n'y entrent pas : ils sont cités dans le résumé). Une carte sans pièce correspondante garde une valeur null : elle ne sera pas affichée.
- Troisième personne, paragraphes séparés par une ligne vide. Pas de formule d'appel ni de signature. En français. Aucun tiret long (—).
TXT;

    public function __construct(private Assistant $assistant) {}

    /** `$force` : aucune fiche n'est reprise, toutes les parties sont relues. */
    public function handle(DocumentRequest $request, bool $force = false): DossierBriefData
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

        $request->load(['uploads', 'lead.guarantorPeople', 'lead.assignee', 'lead.coAssignee']);

        throw_unless(DossierPlan::hasValidFiles($request), RuntimeException::class, 'Aucune pièce validée : la synthèse se prépare dès qu’au moins une pièce est validée.');

        $fingerprint = DossierPlan::fingerprint($request);
        $previous = $request->dossier_brief === null ? null : DossierBriefData::from($request->dossier_brief);
        $plans = DossierPlan::sections($request);
        /** @var list<SectionBrief> $sections */
        $sections = [];
        $reread = 0;

        // L'avancement, partie par partie, pour que la page suive le travail.
        $steps = array_map(fn (array $plan): array => ['key' => $plan['key'], 'label' => $plan['section']->label(), 'person' => $plan['person'], 'state' => 'pending'], $plans);
        $steps[] = ['key' => 'cover', 'label' => 'Page de garde', 'person' => null, 'state' => 'pending'];

        foreach ($plans as $index => $plan) {
            $kept = $force ? null : $this->reusable($previous, $plan);

            if ($kept !== null) {
                $sections[] = $kept;
                $steps = $this->step($steps, $index, 'kept');
                $this->progress($request, $steps);

                continue;
            }

            $steps = $this->step($steps, $index, 'reading');
            $this->progress($request, $steps);
            $sections[] = $this->section($plan);
            $steps = $this->step($steps, $index, 'done');
            $reread++;
        }

        $steps = $this->step($steps, count($plans), 'reading');
        $this->progress($request, $steps);

        $brief = new DossierBriefData(
            cover: $this->cover($request, $sections),
            sections: $sections,
        );

        $request->forceFill([
            'dossier_brief' => $brief->toArray(),
            'dossier_brief_at' => now(),
            'dossier_brief_fingerprint' => $fingerprint,
            'dossier_brief_requested_at' => null,
            'dossier_brief_progress' => null,
        ])->save();

        // Sans acteur : c'est l'assistant qui parle, aux personnes qui suivent le dossier.
        event(new DashboardUpdated(
            'documents',
            ['id' => $request->id, 'uuid' => $request->uuid, 'brief_ready' => true, 'mentions' => self::mentions($request)],
            $previous instanceof DossierBriefData
                ? sprintf('L’assistant a mis à jour le dossier de %s (%d %s relue%s sur %d)', $request->fullName(), $reread, $reread > 1 ? 'fiches' : 'fiche', $reread > 1 ? 's' : '', count($sections))
                : sprintf('L’assistant a préparé le dossier de %s (%d %s)', $request->fullName(), count($sections), count($sections) > 1 ? 'fiches' : 'fiche'),
        ));

        return $brief;
    }

    /**
     * @param  list<array{key: string, label: string, person: string|null, state: string}>  $steps
     * @return list<array{key: string, label: string, person: string|null, state: string}>
     */
    private function step(array $steps, int $index, string $state): array
    {
        return array_map(fn (array $step, int $at): array => $at === $index ? [...$step, 'state' => $state] : $step, $steps, array_keys($steps));
    }

    /**
     * Écrit l'avancement sur la liste : la page le relit tant que la synthèse
     * est en cours.
     *
     * @param  list<array{key: string, label: string, person: string|null, state: string}>  $steps
     */
    private function progress(DocumentRequest $request, array $steps): void
    {
        $done = count(array_filter($steps, fn (array $step): bool => in_array($step['state'], ['done', 'kept'], true)));

        $request->forceFill(['dossier_brief_progress' => ['done' => $done, 'total' => count($steps), 'steps' => $steps]])->save();
    }

    /** Consigne complète : le rôle, puis la forme des valeurs partagée. */
    public static function system(string $role): string
    {
        return $role."\n".self::FORMAT_RULES;
    }

    /**
     * Membres qui suivent le dossier rattaché, pour le toast ciblé.
     *
     * @return list<int>
     */
    public static function mentions(DocumentRequest $request): array
    {
        return $request->lead === null ? [] : array_map(fn (User $member): int => $member->id, $request->lead->followers());
    }

    /**
     * La fiche précédente de cette partie, si ses fichiers n'ont pas bougé et
     * qu'elle a bien été lue : relire dix parties pour un RIB ajouté coûterait
     * dix appels pour rien. Une partie restée sans résumé (panne, trop lourde)
     * est retentée.
     *
     * @param  array{key: string, documents: list<array{key: string, label: string, uploads: list<DocumentUpload>}>}  $plan
     * @return SectionBrief|null
     */
    private function reusable(?DossierBriefData $previous, array $plan): ?array
    {
        $section = $previous?->section($plan['key']);

        if ($section === null || $section['summary'] === null || $section['fingerprint'] === null) {
            return null;
        }

        return $section['fingerprint'] === DossierPlan::sectionFingerprint($plan) ? $section : null;
    }

    /**
     * Fiche d'une partie : les PDF de la partie sont lus ensemble, pour que la
     * moyenne des salaires ou le total de l'épargne se calcule sur tout.
     *
     * @param  array{key: string, person_index: int, person: string, role: string, section: DossierSection, documents: list<array{key: string, label: string, uploads: list<DocumentUpload>}>}  $plan
     * @return SectionBrief
     */
    private function section(array $plan): array
    {
        $files = [];
        $pdfs = [];
        $lines = [];
        $weight = 0;

        foreach ($plan['documents'] as $document) {
            foreach ($document['uploads'] as $upload) {
                $files[] = $upload->original_name;
                $lines[] = sprintf('%d. %s, fichier « %s »', count($files), $document['label'], $upload->original_name);

                $pdf = $upload->mime_type === 'application/pdf' ? Storage::disk(DocumentUpload::DISK)->get($upload->path) : null;

                if ($pdf !== null && $pdf !== '') {
                    $pdfs[] = $pdf;
                    $weight += strlen($pdf);
                }
            }
        }

        if ($pdfs === [] || $weight > self::MAX_SECTION_BYTES) {
            Log::warning('Synthèse du dossier : partie non lue par l’assistant.', ['section' => $plan['key'], 'files' => count($files), 'bytes' => $weight]);

            return DossierBriefData::sectionFrom([], $plan, $files, DossierPlan::sectionFingerprint($plan));
        }

        $prompt = implode("\n", [
            "Partie du dossier : {$plan['section']->label()}",
            "Personne : {$plan['person']} ({$plan['role']})",
            'Ce que la fiche doit relever : '.$plan['section']->focus(),
            'Date du jour : '.now()->toDateString(),
            'Pièces jointes, dans l’ordre :',
            ...$lines,
        ]);

        try {
            $reply = $this->assistant->extractFromPdf(self::system(self::SECTION_SYSTEM), $prompt, DossierBriefData::sectionSchema(), $pdfs);
        } catch (RuntimeException $exception) {
            Log::warning('Synthèse du dossier : la lecture d’une partie a échoué.', ['section' => $plan['key'], 'error' => $exception->getMessage()]);

            return DossierBriefData::sectionFrom([], $plan, $files, DossierPlan::sectionFingerprint($plan));
        }

        return DossierBriefData::sectionFrom($reply, $plan, $files, DossierPlan::sectionFingerprint($plan));
    }

    /**
     * Page de garde : rédigée d'après le projet (ce que l'agence sait du foyer,
     * sans ses coordonnées) et les fiches des parties.
     *
     * @param  list<SectionBrief>  $sections
     * @return Cover
     */
    private function cover(DocumentRequest $request, array $sections): array
    {
        $lines = [DraftPresentationLetter::prompt($request), ''];
        $missing = DossierPlan::missingLabels($request);

        if ($missing !== []) {
            $lines[] = 'Pièces encore attendues (demandées, pas encore validées) : ne les cite pas, n’écris pas que le dossier est complet.';

            foreach ($missing as $label) {
                $lines[] = "- {$label}";
            }

            $lines[] = '';
        }

        $lines[] = 'Fiches récapitulatives du dossier :';

        foreach ($sections as $section) {
            $lines[] = '';
            $lines[] = sprintf('## %s : %s (%s)', $section['label'], $section['person'], $section['role']);
            $lines[] = $section['summary'] ?? 'Partie non lue par l’assistant : '.count($section['documents']).' fichier(s) joint(s).';

            foreach ($section['facts'] as $fact) {
                $lines[] = "- {$fact['label']} : {$fact['value']}";
            }
        }

        $reply = $this->assistant->extract(self::system(self::COVER_SYSTEM), implode("\n", $lines), DossierBriefData::coverSchema());

        return DossierBriefData::from(['cover' => $reply])->cover;
    }
}
