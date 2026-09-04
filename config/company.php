<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Société émettrice (en-tête et pied des factures)
|--------------------------------------------------------------------------
*/

return [
    'name' => env('COMPANY_NAME', 'Relocation In Paris'),
    'address' => env('COMPANY_ADDRESS', "Rue des Alpes 5\n1201 Genève\nSuisse"),
    'email' => env('COMPANY_EMAIL', 'contact@relocation-in-paris.com'),
    'phone' => env('COMPANY_PHONE', '+33 1 84 80 43 44'),
    'vat_number' => env('COMPANY_VAT_NUMBER', 'CHE-000.000.000 TVA'),
    'iban' => env('COMPANY_IBAN', 'CH00 0000 0000 0000 0000 0'),
    'bank' => env('COMPANY_BANK', 'Banque Exemple SA'),

    // Taux de TVA suisse ordinaire, en pourcentage.
    'default_vat_rate' => (float) env('COMPANY_DEFAULT_VAT_RATE', 8.1),
    'default_currency' => env('COMPANY_DEFAULT_CURRENCY', 'CHF'),
    'default_payment_terms_days' => (int) env('COMPANY_PAYMENT_TERMS_DAYS', 30),

    // Prix unitaires par défaut des offres, en centimes, par devise. À ajuster.
    'offers' => [
        'accompagne' => [
            'CHF' => (int) env('OFFER_ACCOMPAGNE_CHF_CENTS', 250_000),
            'EUR' => (int) env('OFFER_ACCOMPAGNE_EUR_CENTS', 260_000),
        ],
        'confie' => [
            'CHF' => (int) env('OFFER_CONFIE_CHF_CENTS', 450_000),
            'EUR' => (int) env('OFFER_CONFIE_EUR_CENTS', 470_000),
        ],
    ],
];
