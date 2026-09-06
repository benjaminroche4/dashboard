@php
    $money = fn (int $cents): string => number_format($cents / 100, 2, $invoice->currency->value === 'CHF' ? '.' : ',', ' ').' '.$invoice->currency->value;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Facture {{ $invoice->number }}</title>
    <style>
        /* Mêmes proportions que l'aperçu à l'écran : texte 14px, gris #737373, traits #e5e5e5. */
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; font-weight: 400; color: #0a0a0a; line-height: 1.45; margin: 0; }
        h1 { font-size: 18pt; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        strong { font-weight: 600; }
        .muted { color: #737373; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .brand { margin-bottom: 4px; line-height: 18px; }
        .brand strong { font-size: 12pt; display: inline-block; vertical-align: middle; line-height: 18px; }
        .logo { width: 18px; height: 18px; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px; }
        .divider { border-top: 1px solid #e5e5e5; margin-top: 6px; padding-top: 6px; }
        .grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .label { font-size: 8pt; text-transform: uppercase; color: #737373; margin-bottom: 4px; }
        .meta { text-align: right; }
        .meta div { margin-bottom: 2px; }
        .meta .muted { margin-right: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 8pt; font-weight: 500; text-transform: uppercase; color: #737373; border-bottom: 1px solid #e5e5e5; padding: 6px 0; }
        td { padding: 7px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .totals { margin-left: auto; width: 64mm; margin-top: 12px; }
        .totals td { border: 0; padding: 2px 0; }
        .totals .total td { border-top: 1px solid #e5e5e5; font-weight: 600; padding-top: 6px; }
        .footer { margin-top: 28px; border-top: 1px solid #e5e5e5; padding-top: 10px; font-size: 9pt; color: #737373; }
        .notes { color: #0a0a0a; margin-bottom: 6px; white-space: pre-line; }
        .pre { white-space: pre-line; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="brand">
                @if (! empty($logo))
                    <img class="logo" src="{{ $logo }}" alt="">
                @endif<strong>{{ $company['name'] }}</strong>
            </div>
            <div class="muted">{{ $company['email'] }}</div>
            <div class="muted">{{ $company['phone'] }}</div>
            <div class="muted pre divider">{{ $company['address'] }}</div>
        </div>
        <div class="meta">
            <h1>Facture</h1>
            <div class="muted num">{{ $invoice->number }}</div>
        </div>
    </div>

    <div class="grid">
        <div>
            <div class="label">Facturé à</div>
            <strong>{{ $invoice->client_name }}</strong>
            @if ($invoice->client_address)
                <div class="muted pre">{{ $invoice->client_address }}</div>
            @endif
            @if ($invoice->client_email)
                <div class="muted">{{ $invoice->client_email }}</div>
            @endif
        </div>
        <div class="meta">
            <div><span class="muted">Date d'émission</span> {{ $invoice->issued_at->translatedFormat('j F Y') }}</div>
            <div><span class="muted">Échéance</span> {{ $invoice->due_at->translatedFormat('j F Y') }}</div>
            <div><span class="muted">Devise</span> {{ $invoice->currency->value }}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="num">Qté</th>
                <th class="num">Prix unitaire</th>
                <th class="num">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items ?? [] as $item)
                <tr>
                    <td>{{ $item['description'] }}</td>
                    <td class="num">{{ rtrim(rtrim(number_format((float) $item['quantity'], 2, '.', ''), '0'), '.') }}</td>
                    <td class="num">{{ $money((int) $item['unit_price_cents']) }}</td>
                    <td class="num">{{ $money((int) round($item['quantity'] * $item['unit_price_cents'])) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td class="muted">Sous-total</td><td class="num">{{ $money($invoice->subtotal_cents) }}</td></tr>
        @if ($invoice->discount_cents > 0)
            <tr><td class="muted">Remise {{ rtrim(rtrim(number_format($invoice->discount_percent, 2, ',', ''), '0'), ',') }} %</td><td class="num">− {{ $money($invoice->discount_cents) }}</td></tr>
        @endif
        <tr><td class="muted">TVA {{ rtrim(rtrim(number_format($invoice->vat_rate, 2, ',', ''), '0'), ',') }} %</td><td class="num">{{ $money($invoice->vat_cents) }}</td></tr>
        <tr class="total"><td>Total</td><td class="num">{{ $money($invoice->amount_cents) }}</td></tr>
        @if ($invoice->deposit_cents > 0)
            <tr><td class="muted">Acompte versé</td><td class="num">− {{ $money($invoice->deposit_cents) }}</td></tr>
            <tr class="total"><td>Reste à payer</td><td class="num">{{ $money($invoice->dueCents()) }}</td></tr>
        @endif
    </table>

    <div class="footer">
        @if ($invoice->notes)
            <div class="notes">{{ $invoice->notes }}</div>
        @endif
        Paiement par virement sur {{ $company['bank'] }}, IBAN {{ $company['iban'] }}, en {{ $invoice->currency->value }}.
    </div>
</body>
</html>
