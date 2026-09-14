@php
    /** Rappel au conseiller : le compte rendu de l'appel vidéo est attendu. Charte du site. */
@endphp
<x-mail-layout
    preheader="Notez vos impressions pendant qu’elles sont fraîches."
    :title="'Bonjour '.($assignee?->name ?? '').', un compte rendu vous attend'"
    :intro="'Votre appel vidéo avec '.$lead->fullName().($lead->reference ? ' ('.$lead->reference.')' : '').' vient d’avoir lieu. Notez vos impressions pendant qu’elles sont fraîches : elles seront recopiées dans la fiche du lead.'"
>
    <x-mail-card heading="L’appel vidéo">
        <x-mail-facts :rows="[
            'Appel vidéo' => ucfirst($when),
            'Formule' => $lead->offer?->label(),
            'E-mail' => $lead->email,
            'Téléphone' => $lead->phone,
        ]" />
    </x-mail-card>

    <x-mail-button :url="$url" note="Vous recevez ce rappel parce que vous suivez ce lead.">
        Rédiger le compte rendu
    </x-mail-button>
</x-mail-layout>
