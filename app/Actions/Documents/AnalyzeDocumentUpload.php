<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\DocumentAnalysisData;
use App\Enums\HouseholdRole;
use App\Events\DashboardUpdated;
use App\Models\DocumentUpload;
use App\Models\User;
use App\Services\Assistant;
use App\Support\DocumentCatalog;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Fait lire une pièce déposée par l'assistant IA : ce qu'est le document,
 * s'il répond à ce qui était demandé, un verdict motivé, et ce qu'on peut en
 * tirer pour la fiche du locataire. La proposition est posée sur la pièce et
 * attend la relecture d'un membre — `status` ne bouge pas ici.
 */
final readonly class AnalyzeDocumentUpload
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris qui monte des dossiers de location pour ses clients, souvent étrangers ou en mutation.
On te montre une pièce justificative déposée par un client. Tu dois dire ce qu'est réellement ce document, s'il correspond à la pièce demandée pour la bonne personne, et s'il est recevable tel quel dans un dossier de location en France.

Règles de recevabilité :
- Le document doit être la pièce demandée, pour la personne nommée (tolère les variantes d'orthographe, les accents et l'ordre prénom/nom).
- Une pièce d'identité ou un titre de séjour doit être en cours de validité à la date du jour.
- Des bulletins de salaire doivent couvrir les trois derniers mois par rapport à la date du jour ; un seul bulletin ancien ne suffit pas.
- Un avis d'imposition doit être le dernier disponible (l'année précédente, ou celle d'avant si l'avis de l'année précédente ne sort qu'à l'automne).
- Un contrat de travail doit être signé ; un justificatif de domicile doit avoir moins de trois mois.
- Un document illisible, incomplet, tronqué, ou dont une page manque, est à redéposer.
Quand tu refuses, écris au client ce qu'il doit redéposer, en une phrase claire et polie.
Relève ensuite, sans jamais deviner, les informations utiles à la fiche du locataire ; un champ que tu ne lis pas avec certitude reste null.
Réponds en français.
TXT;

    public function __construct(private Assistant $assistant) {}

    public function handle(DocumentUpload $upload): DocumentAnalysisData
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');
        throw_unless($upload->mime_type === 'application/pdf', RuntimeException::class, 'Seuls les PDF sont lus par l’assistant.');

        $pdf = Storage::disk(DocumentUpload::DISK)->get($upload->path);
        throw_if($pdf === null || $pdf === '', RuntimeException::class, 'Le fichier de la pièce est introuvable.');

        $upload->loadMissing('request.lead');
        $analysis = DocumentAnalysisData::from($this->assistant->extractFromPdf(
            self::SYSTEM,
            self::prompt($upload),
            DocumentAnalysisData::schema(),
            [$pdf],
        ));

        $upload->forceFill(['ai_review' => $analysis->toArray(), 'ai_reviewed_at' => now()])->save();

        $request = $upload->request;
        $mentions = $request->lead === null ? [] : array_map(fn (User $member): int => $member->id, $request->lead->followers());

        // Sans acteur : c'est l'assistant qui parle, et il s'adresse au suivi du dossier.
        event(new DashboardUpdated(
            'documents',
            ['id' => $request->id, 'uuid' => $request->uuid, 'upload_id' => $upload->id, 'mentions' => $mentions],
            sprintf(
                'L’assistant a lu la pièce « %s » de %s : %s, à relire',
                $upload->original_name,
                $request->fullName(),
                mb_strtolower($analysis->verdict->label()),
            ),
        ));

        return $analysis;
    }

    /** Ce que l'assistant doit savoir de la pièce attendue et de la personne qui la fournit. */
    public static function prompt(DocumentUpload $upload): string
    {
        $request = $upload->request;
        $person = $request->persons[$upload->person_index] ?? [];
        $name = trim(($person['first_name'] ?? '').' '.($person['last_name'] ?? '')) ?: $request->fullName();
        $role = HouseholdRole::tryFrom((string) ($person['role'] ?? ''))?->label() ?? 'Personne du foyer';
        $hint = DocumentCatalog::hint($upload->document_key);

        return implode("\n", [
            'Pièce demandée : '.DocumentCatalog::label($upload->document_key).($hint === null ? '' : " — {$hint}"),
            "Personne : {$name} ({$role})",
            'Date du jour : '.now()->toDateString(),
            "Nom du fichier déposé : {$upload->original_name}",
        ]);
    }
}
