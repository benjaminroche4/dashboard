@php
    /** Compte rendu de visite au client, charte du site (voir components/mail-layout.blade.php). */
    $t = fn (string $french, string $english): string => $fr ? $french : $english;
@endphp
<x-mail-layout
    :locale="app()->getLocale()"
    :preheader="$t('Nos impressions après la visite.', 'Our impressions after the viewing.')"
    :title="$t('Compte rendu de votre visite', 'Your viewing report')"
    :intro="$t(
        'Bonjour '.$lead->first_name.', voici ce que nous retenons de la visite.',
        'Hello '.$lead->first_name.', here is what we took away from the viewing.',
    )"
>
    <x-mail-card :heading="$t('Le bien visité', 'The property')">
        <p style="margin:0;padding:0.25em 0;font-size:1em;font-weight:600">{{ $property->label() }}</p>
        @if ($address !== '')
            <p style="margin:0;padding:0.25em 0;font-size:1em;color:#525252">{{ $address }}</p>
        @endif
        <p style="margin:0;padding:0.25em 0;font-size:0.95em;color:#525252">
            {{ $t('Visite du', 'Viewed on') }} {{ $when }} {{ $t('à', 'at') }} {{ $time }}
        </p>
    </x-mail-card>

    <x-mail-card :heading="$t('Nos impressions', 'Our impressions')">
        <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $report }}</p>
    </x-mail-card>

    @if ($attachedCount > 0)
        <x-mail-card :heading="$t('Les photos', 'Photos')">
            <p style="margin:0;padding:0.25em 0;font-size:1em;color:#525252">
                @if ($photoCount > $attachedCount)
                    {{ $t(
                        $attachedCount.' photo'.($attachedCount > 1 ? 's sont jointes' : ' est jointe').' à cet e-mail, sur les '.$photoCount.' prises pendant la visite.',
                        $attachedCount.' of the '.$photoCount.' photos taken during the viewing '.($attachedCount > 1 ? 'are' : 'is').' attached to this e-mail.',
                    ) }}
                @else
                    {{ $t(
                        $attachedCount > 1 ? 'Les photos prises pendant la visite sont jointes à cet e-mail.' : 'La photo prise pendant la visite est jointe à cet e-mail.',
                        $attachedCount > 1 ? 'The photos taken during the viewing are attached to this e-mail.' : 'The photo taken during the viewing is attached to this e-mail.',
                    ) }}
                @endif
            </p>
        </x-mail-card>
    @endif

    <p style="margin:0;padding:1.2em 0 0;font-size:1em;color:#525252;text-align:center">
        {{ $t('Une question sur ce bien ? Répondez simplement à cet e-mail', 'Any question about this property? Just reply to this e-mail') }}@if ($advisorName !== null), {{ $advisorName }} {{ $t('vous répondra', 'will get back to you') }}@endif.
    </p>
</x-mail-layout>
