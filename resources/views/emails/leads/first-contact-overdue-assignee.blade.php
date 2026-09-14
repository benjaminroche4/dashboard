@php
    /** Alerte au conseiller : son lead attend un premier contact. Charte du site. */
    $qui = array_filter([
        $lead->source->label(),
        $lead->offer?->label(),
        $lead->phone,
        $lead->email,
    ]);
@endphp
<x-mail-layout
    :preheader="'Un premier contact est attendu depuis '.$minutes.' minutes.'"
    :title="'Bonjour '.$firstName.', un lead vous attend depuis '.$minutes.' minutes'"
    :intro="$lead->fullName().' vous est attribué depuis le '.$lead->created_at?->timezone('Europe/Paris')->translatedFormat('j F à H\hi').' et n’a encore reçu aucun premier contact. Un appel ou un message maintenant fait toute la différence.'"
>
    <x-mail-card heading="Le lead">
        <p style="margin:0;padding:0 0 4px;font-size:1em">
            <strong>{{ $lead->fullName() }}</strong>@if ($lead->reference)<span style="color:#737373"> · {{ $lead->reference }}</span>@endif
        </p>
        <p style="margin:0;padding:0;font-size:0.95em;color:#525252">{{ implode(' · ', $qui) }}</p>
    </x-mail-card>

    <x-mail-button :url="route('leads.show', $lead)">Ouvrir la fiche et contacter le lead</x-mail-button>
</x-mail-layout>
