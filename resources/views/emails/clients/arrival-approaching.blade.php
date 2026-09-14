@php
    /** Alerte interne : l'installation du client approche. Charte du site. */
    $districts = collect($client->districts ?? [])->map(fn (int $district): string => $district.'e')->implode(', ');
@endphp
<x-mail-layout
    preheader="{{ 'Installation dans '.$days.' jour'.($days > 1 ? 's' : '').'.' }}"
    :title="'J-'.$days.' avant l’installation de '.$client->householdName()"
    :intro="'Le client arrive '.($arrival ?? 'bientôt').'. Vérifiez que tout est prêt : bail signé, état des lieux, assurance, remise des clés.'"
>
    <x-mail-card heading="Le dossier">
        <x-mail-facts :rows="[
            'Client' => $client->householdName(),
            'Référence' => $client->reference,
            'Arrivée' => $arrival ? ucfirst($arrival) : null,
            'Quartiers visés' => $districts === '' ? null : $districts,
            'Suivi par' => collect($client->followers())->map(fn ($member) => $member->name)->implode(', ') ?: null,
        ]" />
    </x-mail-card>

    <x-mail-button :url="$url" note="Vous recevez cette alerte parce que vous suivez ce dossier.">
        Ouvrir le dossier
    </x-mail-button>
</x-mail-layout>
