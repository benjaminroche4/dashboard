<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\PaymentPlan;

/**
 * Liens de paiement Stripe (Payment Links) préparés dans le tableau de bord
 * Stripe, un par formule, modalité et langue : config/company.php.
 */
final readonly class PaymentLinks
{
    /**
     * @param  array<string, array<string, array<string, string>>>  $links  offre → modalité → langue → URL
     */
    public function __construct(private array $links) {}

    public static function fromConfig(): self
    {
        /** @var array<string, array<string, array<string, string>>> $links */
        $links = config('company.payment_links', []);

        return new self($links);
    }

    public function isConfigured(): bool
    {
        return $this->links !== [];
    }

    /** URL pour cette combinaison, ou null si elle n'existe pas. */
    public function for(Offer $offer, PaymentPlan $plan, LeadLanguage $language): ?string
    {
        $url = $this->links[$offer->value][$plan->value][$language->value] ?? null;

        return is_string($url) && $url !== '' ? $url : null;
    }

    /**
     * Modalités disponibles pour une formule (celles qui ont un lien).
     *
     * @return list<PaymentPlan>
     */
    public function plansFor(Offer $offer): array
    {
        return array_values(array_filter(
            PaymentPlan::cases(),
            fn (PaymentPlan $plan): bool => ($this->links[$offer->value][$plan->value] ?? []) !== [],
        ));
    }
}
