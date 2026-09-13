<?php

declare(strict_types=1);

/**
 * Variable d'environnement vide traitée comme absente : `AWS_URL=` ne doit pas
 * devenir une URL vide, sinon `Storage::url()` fabriquerait des adresses
 * relatives cassées au lieu de retomber sur l'adresse du bucket.
 */
$optional = function (string $key) {
    $value = env($key);

    return is_string($value) && trim($value) === '' ? null : $value;
};

$s3 = [
    'driver' => 's3',
    'key' => $optional('AWS_ACCESS_KEY_ID'),
    'secret' => $optional('AWS_SECRET_ACCESS_KEY'),
    'region' => $optional('AWS_DEFAULT_REGION'),
    'bucket' => $optional('AWS_BUCKET'),
    // URL publique du bucket (ou de son CDN) ; sans elle, l'adresse est
    // fabriquée à partir de l'endpoint et du nom du bucket.
    'url' => $optional('AWS_URL'),
    'endpoint' => $optional('AWS_ENDPOINT'),
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    /*
     * Aucune ACL par objet : les buckets modernes les refusent (accès uniforme
     * sur Google Cloud Storage, « bucket owner enforced » sur S3) et renvoient
     * « InvalidArgument ». Les droits d'accès viennent d'IAM, et rien n'est
     * jamais lisible sans lien signé.
     */
    'options' => ['ACL' => ''],
    'throw' => false,
    'report' => false,
];

/** Un bucket est configuré : les fichiers n'ont plus rien à faire sur la machine. */
$bucket = is_string($s3['bucket']);

/*
 * Préfixe de l'application dans le bucket : le seau peut être partagé avec
 * d'autres services, tout ce qui appartient au backoffice vit sous `dashboard/`.
 */
$prefix = trim((string) env('AWS_PREFIX', 'dashboard'), '/');
$prefix = $prefix === '' ? '' : $prefix.'/';

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
            ? [...$s3, 'root' => $prefix.'private', 'visibility' => 'private']
            : [
                'driver' => 'local',
                'root' => storage_path('app/private'),
                'serve' => true,
                'throw' => false,
                'report' => false,
            ],

        // Rien n'est jamais déposé en lecture publique : les buckets du projet
        // refusent l'accès public (`public_access_prevention`), et les photos
        // sont servies par des URL signées temporaires (`App\Support\FileUrl`).
        'public' => $bucket
            ? [...$s3, 'root' => $prefix.'public', 'visibility' => 'private']
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
