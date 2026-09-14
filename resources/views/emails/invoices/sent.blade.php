@php
    /** Facture envoyée au client, PDF en pièce jointe. Charte du site. */
    $money = fn (int $cents): string => number_format($cents / 100, 2, $invoice->currency->value === 'CHF' ? '.' : ',', ' ').' '.$invoice->currency->value;
    $account = $invoice->bankAccount();
@endphp
<x-mail-layout
    :preheader="'Votre facture '.$invoice->number.' — '.$money($invoice->amount_cents)"
    title="Votre facture"
    :intro="'Bonjour '.$invoice->client_name.', voici votre facture '.$invoice->number.' en pièce jointe.'"
>
    <x-mail-card :heading="'Facture '.$invoice->number">
        <x-mail-facts :rows="[
            'Montant' => $money($invoice->amount_cents),
            'Déjà versé' => $invoice->deposit_cents > 0 ? $money($invoice->deposit_cents) : null,
            'Reste à payer' => $invoice->deposit_cents > 0 ? $money($invoice->dueCents()) : null,
            'Échéance' => $invoice->due_at->translatedFormat('j F Y'),
        ]" />
    </x-mail-card>

    <x-mail-card heading="Régler par virement">
        <x-mail-facts :rows="[
            'Banque' => $account['bank'],
            'IBAN' => $account['iban'],
            'Devise' => $invoice->currency->value,
            'Référence à indiquer' => $account['reference'] !== '' ? $account['reference'] : null,
        ]" />
    </x-mail-card>

    @if ($invoice->notes)
        <x-mail-card heading="Le mot de votre conseiller">
            <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $invoice->notes }}</p>
        </x-mail-card>
    @endif

    <p style="margin:0;padding:1.6em 0 0;font-size:1em;color:#525252;text-align:center">
        Merci de votre confiance,<br />
        <strong>{{ $company['name'] }}</strong><br />
        <span style="color:#9ca3af">{{ $company['email'] }} · {{ $company['phone'] }}</span>
    </p>
</x-mail-layout>
