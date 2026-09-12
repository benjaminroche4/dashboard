<?php

declare(strict_types=1);

$s3 = [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
    // URL publique du bucket (ou de son CDN) : sans elle, `Storage::url()` ne
    // saurait pas fabriquer l'adresse d'une photo.
    'url' => env('AWS_URL'),
    'endpoint' => env('AWS_ENDPOINT'),
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    'throw' => false,
    'report' => false,
];

/** Un bucket est configuré : les fichiers n'ont plus rien à faire sur la machine. */
$bucket = is_string($s3['bucket']) && $s3['bucket'] !== '';

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        // Pièces des clients, avatars, photos des biens : les deux disques que
        // l'application utilise (`local` privé, `public` lisible par URL).
        // Tant qu'aucun bucket n'est configuré, ils vivent sur le disque de la
        // machine ; dès que `AWS_BUCKET` est renseigné (Laravel Cloud), ils
        // basculent dans l'object storage, **sans rien changer dans le code** :
        // le conteneur de Cloud est éphémère, un fichier écrit en local
        // disparaîtrait au déploiement suivant.
        'local' => $bucket
            ? [...$s3, 'root' => 'private', 'visibility' => 'private']
            : [
                'driver' => 'local',
                'root' => storage_path('app/private'),
                'serve' => true,
                'throw' => false,
                'report' => false,
            ],

        'public' => $bucket
            ? [...$s3, 'root' => 'public', 'visibility' => 'public']
            : [
                'driver' => 'local',
                'root' => storage_path('app/public'),
                'url' => rtrim((string) env('APP_URL', 'http://localhost'), '/').'/storage',
                'visibility' => 'public',
                'throw' => false,
                'report' => false,
            ],

        's3' => $s3,

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
