@php
    /** Relance interne : un bien visité attend la décision du client. Charte du site. */
    $address = implode(', ', array_filter([$property->street, trim(($property->postal_code ?? '').' '.($property->city ?? ''))]));
    $jours = $days.' jour'.($days > 1 ? 's' : '');
@endphp
<x-mail-layout
    preheader="Un bien visité attend toujours une réponse."
    :title="'Bonjour '.$member->name.', une décision se fait attendre'"
    :intro="$client->householdName().($client->reference ? ' ('.$client->reference.')' : '').' a visité ce bien il y a '.$jours.' et ne s’est pas encore positionné. À Paris, un bien qui plaît part en quelques jours : un appel maintenant vaut mieux qu’une relance la semaine prochaine.'"
>
    <x-mail-card heading="Le bien visité">
        <x-mail-facts :rows="[
            'Bien' => $property->label(),
            'Adresse' => $address,
            'En attente depuis' => $jours,
        ]" />
    </x-mail-card>

    <x-mail-button :url="$url">Ouvrir le dossier</x-mail-button>
</x-mail-layout>
