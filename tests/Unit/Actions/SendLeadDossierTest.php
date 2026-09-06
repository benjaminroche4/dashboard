<?php

declare(strict_types=1);

use App\Actions\Leads\SendLeadDossier;
use App\Enums\LeadLanguage;
use App\Enums\LeadMailItem;
use App\Enums\Offer;
use App\Enums\PaymentPlan;
use App\Events\DashboardUpdated;
use App\Mail\LeadDossierSent;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

function configureAllSendingServices(): void
{
    config()->set('services.yousign.api_key', 'ys_test');
    config()->set('services.yousign.base_url', 'https://api-sandbox.yousign.app/v3');
    config()->set('services.docraptor.key', 'dr_test');
    Http::fake([
        'api.docraptor.com/*' => Http::response('%PDF-1.4 fake'),
        'api-sandbox.yousign.app/v3/signature_requests' => Http::response(['id' => 'sr_1']),
        'api-sandbox.yousign.app/v3/signature_requests/sr_1/documents' => Http::response(['id' => 'doc_1']),
        'api-sandbox.yousign.app/v3/signature_requests/sr_1/signers' => Http::response(['id' => 'sig_1']),
        'api-sandbox.yousign.app/v3/signature_requests/sr_1/activate' => Http::response(['signers' => [['id' => 'sig_1', 'signature_link' => 'https://yousign.app/sign/abc']]]),
    ]);
}

test('it e-mails the recap, the payment link and the contract link, then logs a note', function (): void {
    configureAllSendingServices();
    $staff = User::factory()->create(['name' => 'Admin']);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'offer' => Offer::Confie, 'language' => LeadLanguage::French, 'last_contacted_at' => null]);

    $links = resolve(SendLeadDossier::class)->handle($lead, [LeadMailItem::Recap, LeadMailItem::PaymentLink, LeadMailItem::ContractLink], $staff);

    expect($links)->toBe(['payment_url' => 'https://payment.relocation-in-paris.fr/b/4gMaEZ9h1dKrcCr7zy7EQ0N', 'contract_url' => 'https://yousign.app/sign/abc']);
    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->hasTo('lea@example.com')
        && $mail->paymentUrl === 'https://payment.relocation-in-paris.fr/b/4gMaEZ9h1dKrcCr7zy7EQ0N'
        && $mail->contractUrl === 'https://yousign.app/sign/abc'
        && in_array(LeadMailItem::Recap, $mail->items, true));
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/signers') && $request['info']['email'] === 'lea@example.com');

    $lead->refresh();
    expect($lead->notes)->toHaveCount(1)
        ->and($lead->notes->first()?->body)->toContain('lea@example.com')->toContain('lien de paiement')->toContain('lien du contrat')
        ->and($lead->notes->first()?->user_id)->toBe($staff->id)
        ->and($lead->last_contacted_at)->not->toBeNull();
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains((string) $event->message, 'a écrit au lead Léa Durand'));
});

test('the e-mail is written in the lead’s contact language', function (): void {
    $english = Lead::factory()->create(['first_name' => 'Emma', 'email' => 'emma@example.com', 'language' => LeadLanguage::English, 'arrival_at' => '2026-11-01', 'districts' => [1, 3]]);
    $french = Lead::factory()->create(['first_name' => 'Léa', 'email' => 'lea@example.com', 'language' => LeadLanguage::French, 'arrival_at' => '2026-11-01', 'districts' => [1, 3]]);

    resolve(SendLeadDossier::class)->handle($english, [LeadMailItem::Recap]);
    resolve(SendLeadDossier::class)->handle($french, [LeadMailItem::Recap]);

    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->hasTo('emma@example.com') && $mail->locale === 'en');
    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->hasTo('lea@example.com') && $mail->locale === 'fr');

    $rendered = (new LeadDossierSent($english, [LeadMailItem::Recap]))->locale('en')->render();
    expect($rendered)->toContain('Hello Emma, here is the summary')->toContain('Desired move-in')->toContain('early November 2026')->toContain('>1st<')->toContain('>3rd<')
        ->toContain('Your housing project')->toContain('What happens next?');
    // Le sujet est traduit au moment de l'envoi, dans la langue du mailable.
    app()->setLocale('en');
    expect((new LeadDossierSent($english, [LeadMailItem::Recap]))->envelope()->subject)->toBe('Emma, the recap of your project in Paris');
    app()->setLocale('fr');
    expect((new LeadDossierSent($french, [LeadMailItem::Recap]))->envelope()->subject)->toBe('Léa, le récapitulatif de votre projet à Paris');
    app()->setLocale('fr');

    $renderedFr = (new LeadDossierSent($french, [LeadMailItem::Recap]))->locale('fr')->render();
    expect($renderedFr)->toContain('Bonjour Léa, voici le récapitulatif')->toContain('début novembre 2026')->toContain('>1er<')->toContain('>3e<')
        ->toContain('Votre projet logement')->toContain('Et ensuite ?')->toContain('155 Rue du Faubourg Saint-Denis');
    expect(app()->getLocale())->toBe('fr');
});

test('the recap alone needs no external service, and replies go to the advisor', function (): void {
    config()->set('mail.from', ['address' => 'contact@relocation-in-paris.fr', 'name' => 'Relocation in Paris']);
    $advisor = User::factory()->create(['name' => 'Camille', 'email' => 'camille@relocation-in-paris.fr']);
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'assigned_to' => $advisor->id]);

    $links = resolve(SendLeadDossier::class)->handle($lead, [LeadMailItem::Recap]);

    expect($links)->toBe(['payment_url' => null, 'contract_url' => null]);
    // Domaine vérifié : l'e-mail part de l'adresse du conseiller.
    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->hasReplyTo('camille@relocation-in-paris.fr', 'Camille')
        // hasFrom() lit aussi l'enveloppe (sans expéditeur ici) : on vérifie l'expéditeur posé sur le mailable.
        && ($mail->from[0]['address'] ?? null) === 'camille@relocation-in-paris.fr'
        && ($mail->from[0]['name'] ?? null) === 'Camille · Relocation in Paris');

    // Domaine non vérifié (compte de dev) : repli sur l'adresse de contact, réponses au conseiller.
    $dev = User::factory()->create(['name' => 'Admin', 'email' => 'admin@admin.fr']);
    $other = Lead::factory()->create(['email' => 'max@example.com', 'assigned_to' => $dev->id]);
    resolve(SendLeadDossier::class)->handle($other, [LeadMailItem::Recap]);
    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->hasTo('max@example.com')
        && ($mail->from[0]['address'] ?? null) === 'contact@relocation-in-paris.fr'
        && $mail->hasReplyTo('admin@admin.fr', 'Admin'));
    expect(SendLeadDossier::canSendAs('Charles@Relocation-In-Paris.fr'))->toBeTrue()
        ->and(SendLeadDossier::canSendAs('charles@gmail.com'))->toBeFalse();
    Http::assertNothingSent();
});

test('it refuses a lead without e-mail, an empty selection, and a missing offer', function (): void {
    $noEmail = Lead::factory()->create(['email' => null, 'phone' => '+33 6 00 00 00 00']);
    expect(fn () => resolve(SendLeadDossier::class)->handle($noEmail, [LeadMailItem::Recap]))
        ->toThrow(ValidationException::class, 'e-mail');

    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'offer' => null]);
    expect(fn () => resolve(SendLeadDossier::class)->handle($lead, []))
        ->toThrow(ValidationException::class, 'au moins un');
    expect(fn () => resolve(SendLeadDossier::class)->handle($lead, [LeadMailItem::PaymentLink]))
        ->toThrow(ValidationException::class, 'formule');

    Mail::assertNothingSent();
});

test('the payment link follows the plan and the language, and refuses a deposit on Accompagné', function (): void {
    $english = Lead::factory()->create(['email' => 'emma@example.com', 'offer' => Offer::Confie, 'language' => LeadLanguage::English]);
    $links = resolve(SendLeadDossier::class)->handle($english, [LeadMailItem::PaymentLink], null, PaymentPlan::Deposit);

    expect($links['payment_url'])->toBe('https://payment.relocation-in-paris.fr/b/6oU00ldxhfSzauj3ji7EQ0u');
    Mail::assertSent(LeadDossierSent::class, fn (LeadDossierSent $mail): bool => $mail->plan === PaymentPlan::Deposit
        && str_contains($mail->locale('en')->render(), '50% deposit on')
        && str_contains($mail->locale('en')->render(), 'Confirm my Confié package'));
    expect($english->notes()->first()?->body)->toContain('acompte de 50 %');

    $accompagne = Lead::factory()->create(['email' => 'lea@example.com', 'offer' => Offer::Accompagne]);
    expect(fn () => resolve(SendLeadDossier::class)->handle($accompagne, [LeadMailItem::PaymentLink], null, PaymentPlan::Deposit))
        ->toThrow(ValidationException::class, 'Accompagné');
});

test('it explains when Yousign is missing instead of failing silently', function (): void {
    config()->set('services.yousign.api_key');
    $lead = Lead::factory()->create(['email' => 'lea@example.com', 'offer' => Offer::Accompagne]);

    expect(fn () => resolve(SendLeadDossier::class)->handle($lead, [LeadMailItem::ContractLink]))
        ->toThrow(ValidationException::class, 'Yousign');
});

test('the subject and the preheader follow what is sent, first name first', function (): void {
    $lead = Lead::factory()->make(['first_name' => 'Léa', 'offer' => Offer::Confie]);
    $recap = new LeadDossierSent($lead, [LeadMailItem::Recap]);
    $payment = new LeadDossierSent($lead, [LeadMailItem::PaymentLink], paymentUrl: 'https://pay');
    $contract = new LeadDossierSent($lead, [LeadMailItem::ContractLink], contractUrl: 'https://sign');
    $both = new LeadDossierSent($lead, [LeadMailItem::PaymentLink, LeadMailItem::ContractLink], 'https://pay', 'https://sign');

    expect($recap->subjectLine(true))->toBe('Léa, le récapitulatif de votre projet à Paris')
        ->and($payment->subjectLine(true))->toBe('Léa, une dernière étape pour lancer votre recherche à Paris')
        ->and($payment->subjectLine(false))->toBe('Léa, one last step to start your search in Paris')
        ->and($contract->subjectLine(true))->toBe('Léa, votre contrat est prêt à signer')
        ->and($both->subjectLine(true))->toBe('Léa, votre formule Confié et votre contrat vous attendent')
        ->and($payment->preheader(true))->toContain('Confirmez votre formule')
        ->and($contract->preheader(false))->toContain('electronic signature')
        ->and($recap->preheader(true))->toContain('Budget, quartiers');
});
