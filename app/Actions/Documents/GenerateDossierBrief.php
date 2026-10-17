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

    private const string SECTION_SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris qui monte des dossiers de location pour ses clients, souvent étrangers ou en mutation.
On te donne les pièces justificatives d'une partie du dossier d'une personne (par exemple ses bulletins de salaire, ou ses avis d'imposition). Rédige la fiche récapitulative qui ouvrira cette partie dans le dossier remis à une agence immobilière ou à un propriétaire.
Règles :
- N'écris que ce que tu lis sur les pièces. Aucun chiffre, aucune date, aucun nom qui n'y figure pas. Un montant est écrit en euros avec son espace de milliers (« 4 150 € »).
- Calcule les moyennes et totaux utiles (revenu net mensuel moyen, épargne totale) à partir des pièces, en disant sur quelle période.
- Signale dans les réserves toute incohérence entre les pièces, période non couverte, ou document proche de l'expiration, sans juger la personne.
- Ton neutre et factuel, à la troisième personne, en français. Pas de formule d'introduction ni de conclusion. Aucun tiret long (—) dans les textes.
TXT;

    private const string COVER_SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. Elle remet le dossier de location complet d'un de ses clients à une agence immobilière ou à un propriétaire, qui reçoit beaucoup de dossiers et tranche vite.
Rédige la présentation qui ouvre ce dossier. Son but : donner envie au bailleur de retenir ce candidat, en restant rigoureusement honnête. Tu écris d'après le projet du client et les fiches récapitulatives de chaque partie (établies sur des pièces vérifiées par l'agence).
Ce que la présentation doit faire :
- Ouvrir sur l'atout le plus fort du dossier, chiffré (revenus du foyer, stabilité du contrat, garantie, épargne, employeur), puis dérouler les autres points forts par ordre d'importance pour un bailleur : capacité à payer (revenus, taux d'effort si le loyer visé est connu, « au moins trois fois le loyer » quand c'est vrai), stabilité professionnelle, garanties, sérieux du dossier (complet, vérifié pièce par pièce par notre équipe), situation du foyer et projet (date d'emménagement, durée).
- Finir sur la disponibilité : le foyer est prêt à visiter et à signer rapidement, l'agence se tient à disposition pour toute pièce complémentaire.
- Chaque affirmation s'appuie sur un fait ou un chiffre des fiches ou du projet. Aucune invention, aucun superlatif, aucune flatterie : ce qui convainc un professionnel, ce sont des faits précis et bien ordonnés.
- Un point faible réel (revenus justes, contrat court, dossier étranger) n'est pas caché : il est dit en une phrase, avec ce qui le compense s'il existe. Les réserves destinées au lecteur restent dans la liste prévue, brèves et factuelles.
- Les points forts sont trois à six lignes courtes et concrètes, chacune avec son chiffre ou son fait, lisibles en balayant la page.
- Les trois cartes (salaires, imposition, épargne) reprennent les chiffres des fiches : le total du foyer en valeur, et une ligne par locataire dans la répartition quand le foyer compte deux locataires (les garants n'y entrent pas : ils sont cités dans la présentation). Une carte sans pièce correspondante garde une valeur null.
- À la première personne du pluriel au nom de l'agence. Phrases courtes, ton professionnel et chaleureux. Entre 800 et 1 500 caractères pour la présentation, en trois ou quatre paragraphes séparés par une ligne vide. Pas de formule d'appel ni de signature : l'en-tête et le pied du document les portent. En français. Aucun tiret long (—).
TXT;

    public function __construct(private Assistant $assistant) {}

    public function handle(DocumentRequest $request): DossierBriefData
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

        $request->load(['uploads', 'lead.guarantorPeople', 'lead.assignee', 'lead.coAssignee']);

        throw_unless(DossierPlan::isComplete($request), RuntimeException::class, 'Le dossier n’est pas complet : chaque pièce demandée doit être validée avant de le préparer.');

        $fingerprint = DossierPlan::fingerprint($request);
        /** @var list<SectionBrief> $sections */
        $sections = [];

        foreach (DossierPlan::sections($request) as $plan) {
            $sections[] = $this->section($plan);
        }

        $brief = new DossierBriefData(
            cover: $this->cover($request, $sections),
            sections: $sections,
        );

        $request->forceFill([
            'dossier_brief' => $brief->toArray(),
            'dossier_brief_at' => now(),
            'dossier_brief_fingerprint' => $fingerprint,
            'dossier_brief_requested_at' => null,
        ])->save();

        // Sans acteur : c'est l'assistant qui parle, aux personnes qui suivent le dossier.
        event(new DashboardUpdated(
            'documents',
            ['id' => $request->id, 'uuid' => $request->uuid, 'mentions' => self::mentions($request)],
            sprintf('L’assistant a préparé le dossier de %s : page de garde et %d fiche(s) récapitulative(s) prêtes', $request->fullName(), count($sections)),
        ));

        return $brief;
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

            return DossierBriefData::sectionFrom([], $plan, $files);
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
            $reply = $this->assistant->extractFromPdf(self::SECTION_SYSTEM, $prompt, DossierBriefData::sectionSchema(), $pdfs);
        } catch (RuntimeException $exception) {
            Log::warning('Synthèse du dossier : la lecture d’une partie a échoué.', ['section' => $plan['key'], 'error' => $exception->getMessage()]);

            return DossierBriefData::sectionFrom([], $plan, $files);
        }

        return DossierBriefData::sectionFrom($reply, $plan, $files);
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
        $lines = [DraftPresentationLetter::prompt($request), '', 'Fiches récapitulatives du dossier :'];

        foreach ($sections as $section) {
            $lines[] = '';
            $lines[] = sprintf('## %s : %s (%s)', $section['label'], $section['person'], $section['role']);
            $lines[] = $section['summary'] ?? 'Partie non lue par l’assistant : '.count($section['documents']).' fichier(s) joint(s).';

            foreach ($section['facts'] as $fact) {
                $lines[] = "- {$fact['label']} : {$fact['value']}";
            }

            foreach ($section['caveats'] as $caveat) {
                $lines[] = "- Réserve : {$caveat}";
            }
        }

        $reply = $this->assistant->extract(self::COVER_SYSTEM, implode("\n", $lines), DossierBriefData::coverSchema());

        return DossierBriefData::from(['cover' => $reply])->cover;
    }
}
