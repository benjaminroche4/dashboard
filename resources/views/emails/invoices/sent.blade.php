@php
    $money = fn (int $cents): string => number_format($cents / 100, 2, $invoice->currency->value === 'CHF' ? '.' : ',', ' ').' '.$invoice->currency->value;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #0a0a0a; line-height: 1.5;">
    <p>Bonjour {{ $invoice->client_name }},</p>
    <p>Veuillez trouver ci-joint votre facture <strong>{{ $invoice->number }}</strong> d'un montant de <strong>{{ $money($invoice->amount_cents) }}</strong>@if ($invoice->deposit_cents > 0), dont {{ $money($invoice->deposit_cents) }} déjà versés (reste à payer : {{ $money($invoice->dueCents()) }})@endif.</p>
    <p>Échéance : <strong>{{ $invoice->due_at->translatedFormat('j F Y') }}</strong>.<br>
    @php($account = $invoice->bankAccount())
    Paiement par virement sur {{ $account['bank'] }}, IBAN {{ $account['iban'] }}, en {{ $invoice->currency->value }}.</p>
    @if ($invoice->notes)
        <p style="white-space: pre-line">{{ $invoice->notes }}</p>
    @endif
    <p>Merci de votre confiance,<br>{{ $company['name'] }}<br><span style="color:#6b7280">{{ $company['email'] }} · {{ $company['phone'] }}</span></p>
</body>
</html>
