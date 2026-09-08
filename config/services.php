<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    // Secret partagé avec le site Relocation In Paris pour signer ses webhooks (HMAC-SHA256).
    'rip' => [
        'webhook_secret' => env('RIP_WEBHOOK_SECRET'),
    ],

    // Assistant IA (Claude) : import d'annonces, qualification des leads, matching. Clé serveur, jamais exposée.
    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model' => env('ANTHROPIC_MODEL', 'claude-opus-5'),
    ],

    // Téléphonie Allo (withallo.com) : secret « whsec_… » de l'endpoint webhook, et envoi de SMS
    // (clé API avec la portée SMS_SEND, numéro Allo expéditeur en E.164 ou Sender ID vérifié pour la France).
    'allo' => [
        'webhook_secret' => env('ALLO_WEBHOOK_SECRET'),
        'api_key' => env('ALLO_API_KEY'),
        'from' => env('ALLO_SMS_FROM'),
        'sender_id' => env('ALLO_SMS_SENDER_ID'),
        'base_url' => env('ALLO_API_URL', 'https://api.withallo.com'),
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        // Clé serveur Google Maps Platform (Places API). Jamais exposée au navigateur.
        'maps_key' => env('GOOGLE_MAPS_API_KEY'),
        // Clé navigateur Google Maps (Maps JavaScript API), restreinte par référent HTTP : exposée au front.
        'maps_browser_key' => env('GOOGLE_MAPS_BROWSER_KEY'),
        // Carte statique des e-mails : clé DÉDIÉE (restreinte à l'API Maps Static, elle part dans les e-mails
        // envoyés aux leads, jamais la clé serveur) et secret de signature d'URL pour qu'elle soit inutilisable ailleurs.
        'static_maps_key' => env('GOOGLE_STATIC_MAPS_KEY'),
        'static_maps_secret' => env('GOOGLE_STATIC_MAPS_SECRET'),
        // Style de carte (Cloud Map ID) pour la carte statique des e-mails, le même que le site Relocation In Paris.
        'static_map_id' => env('GOOGLE_STATIC_MAP_ID', '17a6371e43c53ecdecba3794'),
        // Visios : compte de service Workspace (chemin du JSON ou JSON en base64) et adresse organisatrice centrale.
        'calendar_key_file' => env('GOOGLE_CALENDAR_KEY_FILE'),
        'calendar_organizer' => env('GOOGLE_CALENDAR_ORGANIZER', 'contact@relocation-in-paris.fr'),
    ],

    'yousign' => [
        // Clé API Yousign v3 : demandes de signature du contrat. Sandbox par défaut.
        'api_key' => env('YOUSIGN_API_KEY'),
        'base_url' => env('YOUSIGN_BASE_URL', 'https://api-sandbox.yousign.app/v3'),
    ],

    'docraptor' => [
        'key' => env('DOC_RAPTOR_KEY'),
        'test_mode' => (bool) env('DOC_RAPTOR_TEST_MODE', true),
        'endpoint' => 'https://api.docraptor.com/docs',
    ],

];
