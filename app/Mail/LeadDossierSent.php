<?php

declare(strict_types=1);

namespace App\Mail;

use App\Enums\LeadMailItem;
use App\Enums\PaymentPlan;
use App\Models\Lead;
use App\Services\DistrictStaticMap;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * E-mail au lead, dans la charte du site Relocation In Paris : récapitulatif
 * de son projet et/ou liens de paiement et de contrat.
 */
final class LeadDossierSent extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  list<LeadMailItem>  $items
     */
    public function __construct(
        public readonly Lead $lead,
        public readonly array $items,
        public readonly ?string $paymentUrl = null,
        public readonly ?string $contractUrl = null,
        public readonly PaymentPlan $plan = PaymentPlan::Full,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine(app()->getLocale() !== 'en'));
    }

    /**
     * Sujet pensé pour l'ouverture : prénom en tête, une action ou un
     * bénéfice clair, pas de marque (le nom d'expéditeur la porte déjà).
     */
    public function subjectLine(bool $fr): string
    {
        $name = $this->lead->first_name;
        $offer = $this->lead->offer?->label();
        $payment = $this->paymentUrl !== null;
        $contract = $this->contractUrl !== null;

        return match (true) {
            $payment && $contract => $fr
                ? "{$name}, votre formule {$offer} et votre contrat vous attendent"
                : "{$name}, your {$offer} package and your contract are ready",
            $payment => $fr
                ? "{$name}, une dernière étape pour lancer votre recherche à Paris"
                : "{$name}, one last step to start your search in Paris",
            $contract => $fr
                ? "{$name}, votre contrat est prêt à signer"
                : "{$name}, your contract is ready to sign",
            default => $fr
                ? "{$name}, le récapitulatif de votre projet à Paris"
                : "{$name}, the recap of your project in Paris",
        };
    }

    /** Ligne de prévisualisation, adaptée au contenu, complète le sujet sans le répéter. */
    public function preheader(bool $fr): string
    {
        $payment = $this->paymentUrl !== null;
        $contract = $this->contractUrl !== null;

        return match (true) {
            $payment => $fr
                ? 'Confirmez votre formule en deux minutes, la sélection de biens démarre juste après.'
                : 'Confirm your package in two minutes, the property selection starts right after.',
            $contract => $fr
                ? 'Une signature électronique suffit, aucun document à imprimer.'
                : 'An electronic signature is all it takes, nothing to print.',
            default => $fr
                ? "Budget, quartiers, emménagement : votre projet en un coup d'œil."
                : 'Budget, districts, move-in: your project at a glance.',
        };
    }

    public function content(): Content
    {
        $locale = app()->getLocale();
        $fr = $locale !== 'en';
        $lead = $this->lead;
        $lead->loadMissing('assignee');
        $districts = array_map(intval(...), $lead->districts ?? []);
        sort($districts);
        $offer = $lead->offer;
        $currency = $lead->currency;

        return new Content(view: 'emails.leads.dossier', with: [
            'lead' => $lead,
            'locale' => $locale,
            'fr' => $fr,
            'preheader' => $this->preheader($fr),
            'recap' => in_array(LeadMailItem::Recap, $this->items, true),
            'paymentUrl' => $this->paymentUrl,
            'deposit' => $this->plan === PaymentPlan::Deposit,
            'contractUrl' => $this->contractUrl,
            'offerLabel' => $offer?->label(),
            'offerPrice' => $offer === null ? null : $this->money($offer->defaultPriceCents($currency), $currency->value, $fr),
            'budget' => $lead->budget_cents === null ? null : $this->money($lead->budget_cents, $currency->value, $fr).($fr ? '/mois' : '/mo'),
            'moveIn' => self::moveInLabel($lead->arrival_at, $locale),
            'mapUrl' => resolve(DistrictStaticMap::class)->build($districts, $locale),
            'districtLabels' => array_map(fn (int $d): string => $this->ordinal($d, $fr), $districts),
            'assigneeName' => $lead->assignee?->name,
            'company' => config('company'),
            'mail' => config('company.mail'),
        ]);
    }

    /**
     * Emménagement en termes flous : « le plus tôt possible » à moins d'un
     * mois, sinon début / mi- / fin de mois, dans la langue du lead.
     */
    public static function moveInLabel(?CarbonInterface $moveIn, string $locale): string
    {
        $fr = $locale !== 'en';

        if (! $moveIn instanceof CarbonInterface || $moveIn->lt(now()->addMonth())) {
            return $fr ? 'le plus tôt possible' : 'as soon as possible';
        }

        $month = $moveIn->copy()->setTimezone('Europe/Paris')->locale($locale)->translatedFormat('F Y');
        $day = (int) $moveIn->format('j');

        return match (true) {
            $day <= 10 => $fr ? "début {$month}" : "early {$month}",
            $day <= 20 => $fr ? "mi-{$month}" : "mid-{$month}",
            default => $fr ? "fin {$month}" : "late {$month}",
        };
    }

    private function money(int $cents, string $currency, bool $fr): string
    {
        return number_format($cents / 100, 0, $fr ? ',' : '.', $fr ? ' ' : ',').' '.($currency === 'EUR' ? '€' : $currency);
    }

    private function ordinal(int $district, bool $fr): string
    {
        if ($fr) {
            return $district === 1 ? '1er' : "{$district}e";
        }

        return match ($district) {
            1 => '1st',
            2 => '2nd',
            3 => '3rd',
            default => "{$district}th",
        };
    }
}
