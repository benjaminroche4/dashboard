<?php

declare(strict_types=1);

use App\Enums\LeadMailItem;
use App\Enums\PartnerRole;
use App\Mail\DirectoryWelcome;
use App\Mail\DocumentUploadLinkSent;
use App\Mail\FirstContactOverdue;
use App\Mail\FirstContactOverdueForAssignee;
use App\Mail\InvoiceSent;
use App\Mail\LeadDossierForwarded;
use App\Mail\LeadDossierSent;
use App\Mail\LeadVisioScheduled;
use App\Mail\PropertyDecisionDue as DecisionDue;
use App\Mail\QuoteSent;
use App\Mail\RecontactsDue;
use App\Mail\VisioReportDue;
use App\Mail\VisitReportDue;
use App\Mail\VisitReportSent;
use App\Mail\VisitScheduled;
use App\Models\Agent;
use App\Models\DocumentRequest;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadPartner;
use App\Models\Partner;
use App\Models\Property;
use App\Models\Quote;
use App\Models\User;
use App\Models\Visit;
use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\File;

/** Tous les e-mails de l'application, prêts à être rendus. */
function everyMailable(): array
{
    $advisor = User::factory()->create(['name' => 'Charles Petit', 'phone' => '+33 6 12 34 56 78']);
    $lead = Lead::factory()->create(['assigned_to' => $advisor->id, 'recontact_at' => now()->addDay()]);
    $client = Lead::factory()->converted()->create(['assigned_to' => $advisor->id]);
    $property = Property::factory()->create(['agent_id' => Agent::factory()->create()->id]);
    $visit = Visit::factory()->for($client)->for($property)->create([
        'assigned_to' => $advisor->id,
        'report' => 'Le client a aimé la lumière.',
        'report_submitted_at' => now(),
    ]);
    $partner = Partner::factory()->create();
    $link = LeadPartner::query()->create([
        'lead_id' => $client->id,
        'partner_id' => $partner->id,
        'role' => PartnerRole::Guarantee,
    ]);

    return [
        'DirectoryWelcome' => new DirectoryWelcome('Agence du Marais', 'agence immobilière partenaire', 'agence@example.com', '+33 1 00 00 00 00', $advisor),
        'DocumentUploadLinkSent' => new DocumentUploadLinkSent(DocumentRequest::factory()->create()),
        'FirstContactOverdue' => new FirstContactOverdue($lead, 30),
        'FirstContactOverdueForAssignee' => new FirstContactOverdueForAssignee($lead, $advisor, 30),
        'InvoiceSent' => new InvoiceSent(Invoice::factory()->create()),
        'LeadDossierForwarded' => new LeadDossierForwarded($client, $link, 'Merci de votre retour.', $advisor),
        'LeadDossierSent' => new LeadDossierSent($lead, [LeadMailItem::Recap], 'https://pay.example.com', 'https://sign.example.com'),
        'LeadVisioScheduled' => new LeadVisioScheduled($lead, CarbonImmutable::now()->addDay(), 'https://meet.google.com/abc', false, 'ICS'),
        'PropertyDecisionDue' => new DecisionDue($client, $property, $advisor, 3),
        'QuoteSent' => new QuoteSent(Quote::factory()->create()),
        'RecontactsDue' => new RecontactsDue($advisor, collect([$lead])),
        'VisioReportDue' => new VisioReportDue($lead),
        'VisitReportDue' => new VisitReportDue($visit),
        'VisitReportSent' => new VisitReportSent($visit),
        'VisitScheduled' => new VisitScheduled($visit, 'ICS'),
    ];
}

test('every e-mail is rendered in the Relocation In Paris style', function (): void {
    foreach (everyMailable() as $mailable) {
        expect($mailable)->toBeInstanceOf(Mailable::class);

        $html = $mailable->render();

        // La charte commune : logo, carte blanche de 600 px, mention postale,
        // et la ligne de prévisualisation que seule la charte pose.
        expect($html)
            ->toContain(config('company.mail.logo_url'))
            ->toContain('max-width:600px')
            ->toContain(config('company.mail.postal_line'))
            ->toContain('mso-hide:all');
    }
});

test('each e-mail still says what it is for', function (): void {
    $mailables = everyMailable();

    // Ce que chaque e-mail doit contenir, un à un : la charte ne doit rien
    // avoir emporté de ce qui fait le message.
    $expected = [
        'DirectoryWelcome' => ['Bienvenue parmi nos partenaires', 'agence immobilière partenaire', 'agence@example.com'],
        'DocumentUploadLinkSent' => ['depot/', 'Comment ça se passe'],
        'FirstContactOverdue' => ['attend depuis 30 minutes', 'Ouvrir la fiche'],
        'FirstContactOverdueForAssignee' => ['un lead vous attend depuis 30 minutes', 'Ouvrir la fiche'],
        'InvoiceSent' => ['Votre facture', 'Échéance', 'IBAN'],
        'LeadDossierForwarded' => ['Dossier', 'Merci de votre retour.'],
        'LeadDossierSent' => ['Votre projet logement', 'Bonjour'],
        'LeadVisioScheduled' => ['appel vidéo', 'meet.google.com'],
        'PropertyDecisionDue' => ['une décision se fait attendre', 'En attente depuis', 'Ouvrir le dossier'],
        'QuoteSent' => ['Votre devis', 'Valable jusqu’au'],
        'RecontactsDue' => ['vos recontacts du jour', 'Ouvrir le kanban'],
        'VisioReportDue' => ['un compte rendu vous attend', 'Rédiger le compte rendu'],
        'VisitReportDue' => ['un compte rendu vous attend', 'Rédiger le compte rendu'],
        'VisitReportSent' => ['Compte rendu de votre visite', 'Le bien visité'],
        'VisitScheduled' => ['Votre visite est confirmée', 'Ajouter à votre agenda'],
    ];

    // Aucun e-mail n'est oublié par ce contrôle.
    expect(array_keys($expected))->toBe(array_keys($mailables));

    foreach ($expected as $name => $fragments) {
        $html = $mailables[$name]->render();

        foreach ($fragments as $fragment) {
            expect([$name, str_contains($html, $fragment)])->toBe([$name, true]);
        }
    }
});

test('no e-mail view builds its own scaffolding', function (): void {
    $views = collect(File::allFiles(resource_path('views/emails')))
        ->filter(fn ($file): bool => str_ends_with($file->getFilename(), '.blade.php'));

    expect($views)->not->toBeEmpty();

    foreach ($views as $view) {
        $body = file_get_contents($view->getPathname());

        expect([$view->getRelativePathname(), str_contains($body, '<x-mail-layout')])
            ->toBe([$view->getRelativePathname(), true]);
    }
});
