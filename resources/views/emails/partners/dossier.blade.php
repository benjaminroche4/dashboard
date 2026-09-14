@php
    /** Dossier d'un client transmis à un partenaire. Charte du site. */
    $mail = config('company.mail');
    $rows = [
        'Client' => $lead->fullName(),
        'Téléphone' => $lead->phone,
        'E-mail' => $lead->email,
        'Société' => $lead->company,
        'Formule' => $lead->offer?->label(),
        'Budget mensuel' => $budget,
        'Emménagement' => $moveIn,
        'Arrondissements' => $districts,
        'Type de bien' => $propertyTypes ?: null,
        'Durée' => $lead->duration?->label(),
        'Garant' => $lead->guarantors?->map(fn ($g) => $g->label())->implode(', ') ?: null,
        'Ville d’origine' => $lead->origin_city,
    ];
@endphp
<x-mail-layout
    :preheader="'Dossier '.$lead->fullName().' — '.$link->role->label()"
    :title="'Dossier '.$lead->fullName()"
    :intro="'Bonjour '.$partner->name.', nous vous transmettons ce dossier pour : '.$link->role->label().'.'"
>
    @if ($intro)
        <x-mail-card heading="Le mot de votre contact">
            <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $intro }}</p>
        </x-mail-card>
    @endif

    <x-mail-card heading="Le dossier">
        <x-mail-facts :rows="$rows" />
    </x-mail-card>

    @if ($lead->message)
        <x-mail-card heading="Note du client">
            <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $lead->message }}</p>
        </x-mail-card>
    @endif

    <p style="margin:0;padding:1.6em 0 0;font-size:1em;color:#525252;text-align:center">
        @if ($sender)
            Votre contact : <strong>{{ $sender->name }}</strong> · <a href="mailto:{{ $sender->email }}" style="color:#71172e">{{ $sender->email }}</a>
        @else
            L’équipe Relocation in Paris
        @endif
        @if (! empty($mail['phone_display']))
            · {{ $mail['phone_display'] }}
        @endif
    </p>
</x-mail-layout>
