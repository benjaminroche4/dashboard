@php
    /** Alerte : un lead n'a reçu aucun contact dans le délai. Charte du site. */
    $qui = array_filter([
        $lead->source->label(),
        $lead->offer?->label(),
        $lead->phone,
        $lead->email,
    ]);
@endphp
<x-mail-layout
    :preheader="'Aucun contact depuis '.$minutes.' minutes.'"
    :title="'Un nouveau lead attend depuis '.$minutes.' minutes'"
    :intro="$lead->fullName().' a été créé le '.$lead->created_at?->timezone('Europe/Paris')->translatedFormat('j F à H\hi').' et n’a encore reçu aucun contact de l’équipe.'"
>
    <x-mail-card heading="Le lead">
        <p style="margin:0;padding:0 0 4px;font-size:1em">
            <strong>{{ $lead->fullName() }}</strong>@if ($lead->reference)<span style="color:#737373"> · {{ $lead->reference }}</span>@endif
        </p>
        <p style="margin:0;padding:0;font-size:0.95em;color:#525252">{{ implode(' · ', $qui) }}</p>
        <p style="margin:0;padding:6px 0 0;font-size:0.95em;{{ $lead->assignee ? 'color:#525252' : 'color:#b91c1c;font-weight:600' }}">
            {{ $lead->assignee ? 'Suivi par '.$lead->assignee->name : 'Non attribué' }}
        </p>
    </x-mail-card>

    <x-mail-button :url="route('leads.show', $lead)">Ouvrir la fiche</x-mail-button>
</x-mail-layout>
