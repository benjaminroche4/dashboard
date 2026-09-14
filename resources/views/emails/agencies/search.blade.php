@php
    /** Recherche d'un client envoyée à une agence immobilière. Charte du site. */
    $greeting = $agent !== null ? $agent->first_name : ($agency?->name ?? '');
@endphp
<x-mail-layout
    :preheader="'Recherche de logement pour un client de Relocation in Paris'"
    :title="'Recherche de logement'"
    :intro="'Bonjour '.$greeting.', nous cherchons un logement pour l’un de nos clients et pensons que vous pouvez nous aider.'"
>
    <x-mail-card heading="Le mot de votre contact">
        <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $intro }}</p>
    </x-mail-card>

    <x-mail-card heading="La recherche">
        <x-mail-facts :rows="$rows" />
    </x-mail-card>

    <p style="margin:0;padding:1.6em 0 0;font-size:1em;color:#525252;text-align:center">
        Répondez simplement à cet e-mail avec vos propositions : elles arrivent directement à
        <strong>{{ $sender->name }}</strong> · <a href="mailto:{{ $sender->email }}" style="color:#71172e">{{ $sender->email }}</a>
        @if (! empty($mail['phone_display']))
            · {{ $mail['phone_display'] }}
        @endif
    </p>
</x-mail-layout>
