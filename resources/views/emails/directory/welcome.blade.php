@php
    /** Bienvenue à un partenaire, une agence ou un agent ajouté à l'annuaire. Charte du site. */
    $mail = config('company.mail');
@endphp
<x-mail-layout
    preheader="Nous vous solliciterons pour nos clients qui s’installent à Paris."
    title="Bienvenue parmi nos partenaires"
    :intro="'Bonjour '.$name.', nous venons de vous ajouter à l’annuaire des partenaires de Relocation in Paris, en tant que '.$category.'. Nous accompagnons des personnes qui s’installent à Paris et nous vous solliciterons lorsque l’un de nos clients aura besoin de vos services.'"
>
    <x-mail-card heading="Ce que nous avons enregistré">
        <x-mail-facts :rows="[
            'Catégorie' => $category,
            'E-mail' => $email,
            'Téléphone' => $phone,
        ]" />
    </x-mail-card>

    {{-- Signature : un nom, une adresse, un téléphone. --}}
    <p style="margin:0;padding:1.6em 0 0;color:#525252;text-align:center">
        @if ($sender)
            <strong>{{ $sender->name }}</strong> · <a href="mailto:{{ $sender->email }}" style="color:#71172e">{{ $sender->email }}</a>
        @else
            <strong>L’équipe Relocation in Paris</strong>
        @endif
        @if (! empty($mail['phone_display']))
            · {{ $mail['phone_display'] }}
        @endif
    </p>
</x-mail-layout>
