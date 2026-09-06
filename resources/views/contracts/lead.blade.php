@php
    $money = number_format($amountCents / 100, 2, ',', ' ').' '.$currency->value;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Helvetica, Arial, sans-serif; font-size: 12pt; color: #0a0a0a; line-height: 1.5; margin: 40px; }
        h1 { font-size: 18pt; margin-bottom: 4px; }
        .muted { color: #6b7280; }
        table { border-collapse: collapse; margin: 16px 0; }
        td { padding: 4px 16px 4px 0; vertical-align: top; }
        .signature { margin-top: 60px; height: 90px; border: 1px dashed #9ca3af; width: 260px; padding: 6px; font-size: 10pt; color: #6b7280; }
    </style>
</head>
<body>
    @if ($logo)<img src="{{ $logo }}" alt="" style="height: 48px">@endif
    <h1>Contrat de prestation · {{ $offer->description() }}</h1>
    <p class="muted">{{ $company['name'] }} · {{ $company['email'] }} · {{ $company['phone'] }}</p>

    <table>
        <tr><td class="muted">Client</td><td>{{ $lead->fullName() }}@if ($lead->company) · {{ $lead->company }}@endif</td></tr>
        <tr><td class="muted">E-mail</td><td>{{ $lead->email }}</td></tr>
        <tr><td class="muted">Formule</td><td>{{ $offer->label() }} — {{ $offer->summary() }}</td></tr>
        <tr><td class="muted">Prix</td><td>{{ $money }} TTC</td></tr>
        @if ($lead->arrival_at)
            <tr><td class="muted">Emménagement souhaité</td><td>{{ $lead->arrival_at->translatedFormat('j F Y') }}</td></tr>
        @endif
        <tr><td class="muted">Date</td><td>{{ now()->translatedFormat('j F Y') }}</td></tr>
    </table>

    <p>Le client confie à {{ $company['name'] }} la mission décrite ci-dessus, aux conditions générales communiquées par ailleurs. Le présent contrat prend effet à sa signature.</p>

    <div class="signature">Signature du client</div>
</body>
</html>
