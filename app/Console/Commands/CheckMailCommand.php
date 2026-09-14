<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Mail\CheckMailSetup;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

final class CheckMailCommand extends Command
{
    protected $signature = 'mail:check {--to= : Adresse à qui envoyer deux e-mails de test}';

    protected $description = "Vérifie la chaîne d'envoi des e-mails (transport, expéditeur, file d'attente)";

    public function handle(CheckMailSetup $check): int
    {
        $checks = $check->handle();

        $this->table(
            ['', 'Point de contrôle', 'Détail'],
            array_map(fn (array $row): array => [
                match ($row['level']) {
                    CheckMailSetup::FAIL => '<fg=red>ÉCHEC</>',
                    CheckMailSetup::WARN => '<fg=yellow>ATTENTION</>',
                    default => '<fg=green>OK</>',
                },
                $row['check'],
                $row['detail'],
            ], $checks),
        );

        $to = $this->option('to');

        if (is_string($to) && $to !== '') {
            $this->testSend($to);
        }

        if (CheckMailSetup::failed($checks)) {
            $this->error('La chaîne d’envoi est interrompue : corrigez les lignes en échec.');

            return self::FAILURE;
        }

        $this->info('Configuration d’envoi cohérente.');

        return self::SUCCESS;
    }

    /**
     * Deux envois au même destinataire : l'un **hors file** (le transport
     * parle-t-il au fournisseur ?), l'autre **par la file** (le worker
     * tourne-t-il ?). Ce que le destinataire reçoit dit lequel des deux est
     * en cause — c'est tout l'intérêt de les séparer.
     */
    private function testSend(string $to): void
    {
        $now = now()->format('d/m/Y H:i:s');

        try {
            Mail::html(
                "<p>Test d’envoi <strong>direct</strong> (hors file d’attente) — {$now}.</p>",
                fn ($message) => $message->to($to)->subject('Dashboard · test direct'),
            );
            $this->line("<fg=green>OK</> Envoi direct accepté par le transport → {$to}");
        } catch (Throwable $e) {
            $this->line('<fg=red>ÉCHEC</> Envoi direct refusé : '.$e->getMessage());
            $this->line('   Le transport est en cause (clé, domaine non vérifié, réseau) : inutile de chercher du côté de la file.');

            return;
        }

        dispatch(function () use ($to, $now): void {
            Mail::html(
                "<p>Test d’envoi <strong>par la file d’attente</strong> — {$now}.</p>",
                fn ($message) => $message->to($to)->subject('Dashboard · test par la file'),
            );
        });

        $this->line("<fg=green>OK</> Envoi par la file mis en attente → {$to}");
        $this->newLine();
        $this->line('Relevez maintenant la boîte :');
        $this->line('  • les <options=bold>deux</> e-mails arrivent → la chaîne fonctionne, le problème est ailleurs (destinataire, spam).');
        $this->line('  • seul le <options=bold>direct</> arrive → le worker de queue ne tourne pas (`php artisan queue:work`).');
        $this->line('  • <options=bold>aucun</> n’arrive → le fournisseur accepte puis rejette : regardez le journal Resend.');
    }
}
