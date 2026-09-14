@php
    /** Devis envoyé au client, PDF en pièce jointe. Charte du site. */
    $money = fn (int $cents): string => number_format($cents / 100, 2, $quote->currency->value === 'CHF' ? '.' : ',', ' ').' '.$quote->currency->value;
@endphp
<x-mail-layout
    :preheader="'Votre devis '.$quote->number.' — '.$money($quote->amount_cents)"
    title="Votre devis"
    :intro="'Bonjour '.$quote->client_name.', voici notre devis '.$quote->number.' en pièce jointe.'"
>
    <x-mail-card :heading="'Devis '.$quote->number">
        <x-mail-facts :rows="[
            'Montant' => $money($quote->amount_cents),
            'Valable jusqu’au' => $quote->valid_until->translatedFormat('j F Y'),
        ]" />
        <p style="margin:0;padding:0.75em 0 0;font-size:0.95em;color:#525252">
            Pour l’accepter, il vous suffit de répondre à cet e-mail.
        </p>
    </x-mail-card>

    @if ($quote->notes)
        <x-mail-card heading="Le mot de votre conseiller">
            <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $quote->notes }}</p>
        </x-mail-card>
    @endif

    <p style="margin:0;padding:1.6em 0 0;font-size:1em;color:#525252;text-align:center">
        Nous restons à votre disposition,<br />
        <strong>{{ $company['name'] }}</strong><br />
        <span style="color:#9ca3af">{{ $company['email'] }} · {{ $company['phone'] }}</span>
    </p>
</x-mail-layout>
