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

    // Préfixe des numéros de facture : RP + code activité (27 = agent immobilier), puis séquence.
    'invoice_prefix' => env('COMPANY_INVOICE_PREFIX', 'RP-27'),

    // Préfixe des numéros de devis (DV = devis), même séquence à 3 chiffres minimum.
    'quote_prefix' => env('COMPANY_QUOTE_PREFIX', 'DV-27'),

    /*
     * Premier contact d'un nouveau lead : au-delà du délai sans contact, une alerte
     * part à l'adresse de contact de l'équipe (une seule fois par lead).
     */
    'first_contact' => [
        'minutes' => (int) env('LEAD_FIRST_CONTACT_MINUTES', 30),
        'alert_email' => env('LEAD_FIRST_CONTACT_ALERT_EMAIL', env('COMPANY_EMAIL', 'contact@relocation-in-paris.com')),
    ],

    /*
     * Identité des e-mails envoyés aux leads (même charte que le site Relocation In Paris).
     */
    'mail' => [
        'logo_url' => env('COMPANY_MAIL_LOGO_URL', 'https://resend-attachments.s3.amazonaws.com/y8VsZ3nZ1GDIWiz'),
        'phone_display' => env('COMPANY_PHONE_DISPLAY', '+(33) 1 84 80 43 44'),
        'whatsapp_url' => env('COMPANY_WHATSAPP_URL', 'https://wa.me/33761719439'),
        'postal_line' => env('COMPANY_POSTAL_LINE', 'Relocation in Paris, 155 Rue du Faubourg Saint-Denis, 75010 Paris'),
        'reviews_url' => env('COMPANY_REVIEWS_URL', 'https://share.google/c8msBrKphxqVY03er'),
        // Domaines vérifiés chez Resend : un conseiller dont l'e-mail est sur l'un d'eux envoie en son nom.
        'sender_domains' => array_values(array_filter(array_map(trim(...), explode(',', (string) env('COMPANY_SENDER_DOMAINS', 'relocation-in-paris.fr,estate-in-paris.fr'))))),
    ],

    // Taux de TVA suisse ordinaire, en pourcentage.
    'default_vat_rate' => (float) env('COMPANY_DEFAULT_VAT_RATE', 8.1),

    // Taux proposés dans le formulaire : normal, réduit, exonéré.
    'vat_rates' => [
        ['value' => 8.1, 'label' => '8,1 % · taux normal'],
        ['value' => 2.6, 'label' => '2,6 % · taux réduit'],
        ['value' => 0.0, 'label' => '0 % · exonéré / export'],
    ],
    'default_currency' => env('COMPANY_DEFAULT_CURRENCY', 'EUR'),
    'default_payment_terms_days' => (int) env('COMPANY_PAYMENT_TERMS_DAYS', 30),
    // Durée de validité d'un devis, en jours, proposée par défaut.
    'default_quote_validity_days' => (int) env('COMPANY_QUOTE_VALIDITY_DAYS', 30),

    // Pays proposés pour l'adresse du client (le premier est présélectionné).
    'countries' => [
        ['code' => 'CH', 'name' => 'Suisse'],
        ['code' => 'FR', 'name' => 'France'],
        ['code' => 'DE', 'name' => 'Allemagne'],
        ['code' => 'IT', 'name' => 'Italie'],
        ['code' => 'BE', 'name' => 'Belgique'],
        ['code' => 'LU', 'name' => 'Luxembourg'],
        ['code' => 'GB', 'name' => 'Royaume-Uni'],
        ['code' => 'US', 'name' => 'États-Unis'],
        ['code' => null, 'name' => 'Autre'],
    ],

    // Prix unitaires par défaut des offres, en centimes, par devise (1 190 et 2 190).
    /*
     * Liens de paiement Stripe (Payment Links) par formule, modalité et langue.
     * « deposit » = acompte de 50 %. Absent pour Accompagné : pas d'acompte sur cette offre.
     */
    'payment_links' => [
        'confie' => [
            'full' => [
                'fr' => 'https://payment.relocation-in-paris.fr/b/4gMaEZ9h1dKrcCr7zy7EQ0N',
                'en' => 'https://payment.relocation-in-paris.fr/b/28EbJ3dxhbCjfODcTS7EQ0M',
            ],
            'deposit' => [
                'fr' => 'https://payment.relocation-in-paris.fr/b/aFa14p9h15dVfOD9HG7EQ0x',
                'en' => 'https://payment.relocation-in-paris.fr/b/6oU00ldxhfSzauj3ji7EQ0u',
            ],
        ],
        'accompagne' => [
            'full' => [
                'fr' => 'https://payment.relocation-in-paris.fr/b/dRm28teBlbCjgSH0767EQ0E',
                'en' => 'https://payment.relocation-in-paris.fr/b/6oU9AVbp96hZbyn1ba7EQ0F',
            ],
        ],
    ],

    'offers' => [
        'accompagne' => [
            'CHF' => (int) env('OFFER_ACCOMPAGNE_CHF_CENTS', 119_000),
            'EUR' => (int) env('OFFER_ACCOMPAGNE_EUR_CENTS', 119_000),
        ],
        'confie' => [
            'CHF' => (int) env('OFFER_CONFIE_CHF_CENTS', 219_000),
            'EUR' => (int) env('OFFER_CONFIE_EUR_CENTS', 219_000),
        ],
    ],
];
