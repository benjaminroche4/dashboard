<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Documents\AnalyzeDocumentUpload;
use App\Models\DocumentUpload;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Lecture IA d'une pièce déposée, en arrière-plan : lancée au dépôt pour que la
 * proposition attende déjà le membre qui ouvrira la liste. Une panne de
 * l'assistant est journalisée, jamais bloquante.
 */
final class AnalyzeDocumentUploadJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public readonly DocumentUpload $upload) {}

    public function handle(AnalyzeDocumentUpload $analyze): void
    {
        try {
            $analyze->handle($this->upload->fresh() ?? $this->upload);
        } catch (RuntimeException $exception) {
            Log::warning('Lecture IA de la pièce impossible.', ['upload' => $this->upload->id, 'error' => $exception->getMessage()]);
        }
    }
}
