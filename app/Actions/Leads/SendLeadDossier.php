<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Actions\Invoices\SendInvoice;
use App\Enums\Currency;
use App\Enums\LeadMailItem;
use App\Enums\PaymentPlan;
use App\Events\DashboardUpdated;
use App\Mail\LeadDossierSent;
use App\Models\Lead;
use App\Models\User;
use App\Services\DocRaptor;
use App\Services\PaymentLinks;
use App\Services\Yousign;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Envoie au lead, par e-mail, les éléments cochés : récapitulatif du dossier,
 * lien de paiement (Stripe Payment Link de la formule, dans sa langue) et
 * lien de signature du contrat (Yousign).
 * L'envoi est journalisé dans les notes du lead.
 */
final readonly class SendLeadDossier
{
    public function __construct(
        private PaymentLinks $paymentLinks,
        private Yousign $yousign,
        private DocRaptor $docRaptor,
    ) {}

    /**
     * @param  list<LeadMailItem>  $items
     * @return array{payment_url: string|null, contract_url: string|null}
     *
     * @throws ValidationException si le lead n'a pas d'e-mail, si rien n'est coché ou si un service manque
     */
    public function handle(Lead $lead, array $items, ?User $by = null, PaymentPlan $plan = PaymentPlan::Full): array
    {
        if ($items === []) {
            throw ValidationException::withMessages(['items' => __('Cochez au moins un élément à envoyer.')]);
        }

        if ($lead->email === null || $lead->email === '') {
            throw ValidationException::withMessages(['email' => __('Ajoutez un e-mail au lead avant de lui écrire.')]);
        }

        $offer = $lead->offer;

        if (($this->wants($items, LeadMailItem::PaymentLink) || $this->wants($items, LeadMailItem::ContractLink)) && $offer === null) {
            throw ValidationException::withMessages(['items' => __('Choisissez une formule avant d’envoyer un lien de paiement ou de contrat.')]);
        }

        $currency = $lead->currency ?? Currency::EUR;
        $amountCents = $offer?->defaultPriceCents($currency) ?? 0;
        $paymentUrl = null;
        $contractUrl = null;

        if ($this->wants($items, LeadMailItem::PaymentLink) && $offer !== null) {
            $paymentUrl = $this->paymentLinks->for($offer, $plan, $lead->language);

            if ($paymentUrl === null) {
                throw ValidationException::withMessages(['payment_plan' => __('Pas de lien de paiement « :plan » pour la formule :offer.', ['plan' => $plan->label(), 'offer' => $offer->label()])]);
            }
        }

        if ($this->wants($items, LeadMailItem::ContractLink) && $offer !== null) {
            if (! $this->yousign->isConfigured() || ! $this->docRaptor->isConfigured()) {
                throw ValidationException::withMessages(['items' => __('Le lien du contrat n’est pas disponible : Yousign et DocRaptor doivent être configurés.')]);
            }

            $html = view('contracts.lead', [
                'lead' => $lead,
                'offer' => $offer,
                'amountCents' => $amountCents,
                'currency' => $currency,
                'company' => config('company'),
                'logo' => SendInvoice::logoDataUri(),
            ])->render();
            $pdf = $this->docRaptor->pdf($html, "contrat-{$lead->id}.pdf");
            $contractUrl = $this->yousign->signatureLink($lead, $pdf, "Contrat {$offer->description()} · {$lead->fullName()}");
        }

        // Dans la langue de contact du lead : sujet, corps et dates. Les réponses vont au conseiller.
        $mailable = new LeadDossierSent(
            lead: $lead,
            items: $items,
            paymentUrl: $paymentUrl,
            contractUrl: $contractUrl,
            plan: $plan,
        );
        $assignee = $lead->assignee;

        // L'e-mail part du conseiller lui-même (« Charles · Relocation in Paris », charles@…)
        // si son domaine est vérifié chez Resend ; sinon de l'adresse de contact, réponses au conseiller.
        if ($assignee !== null) {
            $fromAddress = self::canSendAs($assignee->email) ? $assignee->email : (string) config('mail.from.address');

            if ($fromAddress !== '') {
                $mailable->from($fromAddress, "{$assignee->name} · ".config('mail.from.name'));
            }

            $mailable->replyTo($assignee->email, $assignee->name);
        }

        Mail::to($lead->email, $lead->fullName())->locale($lead->language->value)->send($mailable);

        $labels = implode(', ', array_map(
            fn (LeadMailItem $item): string => mb_strtolower($item->label()).($item === LeadMailItem::PaymentLink && $plan === PaymentPlan::Deposit ? ' (acompte de 50 %)' : ''),
            $items,
        ));
        $lead->notes()->create(['body' => "Envoi au lead ({$lead->email}) : {$labels}.", 'user_id' => $by?->id]);
        $lead->forceFill(['last_contacted_at' => now()])->save();

        event(new DashboardUpdated('leads', ['id' => $lead->id], "a écrit au lead {$lead->fullName()} ({$labels})"));

        return ['payment_url' => $paymentUrl, 'contract_url' => $contractUrl];
    }

    /** Vrai si l'adresse est sur un domaine d'expédition vérifié (config company.mail.sender_domains). */
    public static function canSendAs(string $email): bool
    {
        $domain = strtolower((string) strrchr($email, '@'));
        /** @var list<string> $allowed */
        $allowed = config('company.mail.sender_domains', []);

        return $domain !== '' && in_array(ltrim($domain, '@'), array_map(strtolower(...), $allowed), true);
    }

    /**
     * @param  list<LeadMailItem>  $items
     */
    private function wants(array $items, LeadMailItem $item): bool
    {
        return in_array($item, $items, true);
    }
}
