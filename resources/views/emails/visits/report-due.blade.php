@php
    /** Rappel au membre qui a visité : le compte rendu est attendu. Charte du site. */
    $address = implode(', ', array_filter([$property->street, trim(($property->postal_code ?? '').' '.($property->city ?? ''))]));
@endphp
<x-mail-layout
    preheader="Notez vos impressions pendant qu’elles sont fraîches."
    :title="'Bonjour '.($assignee?->name ?? '').', un compte rendu vous attend'"
    :intro="'La visite de '.$client->fullName().($client->reference ? ' ('.$client->reference.')' : '').' vient d’avoir lieu. Notez vos impressions pendant qu’elles sont fraîches : elles seront recopiées dans le dossier du client.'"
>
    <x-mail-card heading="La visite">
        <x-mail-facts :rows="[
            'Bien' => $property->label(),
            'Adresse' => $address,
            'Visite' => ucfirst($when),
            'Agent' => $visit->agent?->fullName(),
        ]" />
    </x-mail-card>

    <x-mail-button :url="$url" note="Vous recevez ce rappel parce que vous étiez chargé de cette visite.">
        Rédiger le compte rendu
    </x-mail-button>
</x-mail-layout>
