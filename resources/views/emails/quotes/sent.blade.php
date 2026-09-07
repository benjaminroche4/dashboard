@php
    $money = fn (int $cents): string => number_format($cents / 100, 2, $quote->currency->value === 'CHF' ? '.' : ',', ' ').' '.$quote->currency->value;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #0a0a0a; line-height: 1.5;">
    <p>Bonjour {{ $quote->client_name }},</p>
    <p>Veuillez trouver ci-joint notre devis <strong>{{ $quote->number }}</strong> d'un montant de <strong>{{ $money($quote->amount_cents) }}</strong>.</p>
    <p>Ce devis est valable jusqu'au <strong>{{ $quote->valid_until->translatedFormat('j F Y') }}</strong>. Pour l'accepter, il vous suffit de nous répondre à cet e-mail.</p>
    @if ($quote->notes)
        <p style="white-space: pre-line">{{ $quote->notes }}</p>
    @endif
    <p>Nous restons à votre disposition pour toute question,<br>{{ $company['name'] }}<br><span style="color:#6b7280">{{ $company['email'] }} · {{ $company['phone'] }}</span></p>
</body>
</html>
