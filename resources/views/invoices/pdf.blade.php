@php
    $money = fn (int $cents): string => number_format($cents / 100, 2, $invoice->currency->value === 'CHF' ? '.' : ',', ' ').' '.$invoice->currency->value;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Facture {{ $invoice->number }}</title>
    <style>
        @page { size: A4; margin: 18mm 16mm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; color: #0a0a0a; }
        h1 { font-size: 22pt; margin: 0; }
        .muted { color: #6b7280; }
        .header { display: flex; justify-content: space-between; margin-bottom: 28px; }
        .grid { display: flex; justify-content: space-between; margin-bottom: 28px; }
        .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 8.5pt; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 6px 0; }
        td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .totals { margin-left: auto; width: 60mm; margin-top: 16px; }
        .totals td { border: 0; padding: 3px 0; }
        .totals .total td { border-top: 1px solid #0a0a0a; font-weight: bold; padding-top: 8px; }
        .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 9pt; color: #6b7280; }
        .notes { color: #0a0a0a; margin-bottom: 8px; white-space: pre-line; }
        .pre { white-space: pre-line; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <strong>{{ $company['name'] }}</strong>
            <div class="muted pre">{{ $company['address'] }}</div>
            <div class="muted">{{ $company['email'] }} · {{ $company['phone'] }}</div>
        </div>
        <div style="text-align: right">
            <h1>Facture</h1>
            <div class="muted">{{ $invoice->number }}</div>
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
        <div style="text-align: right">
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
        <tr><td class="muted">TVA {{ rtrim(rtrim(number_format($invoice->vat_rate, 2, ',', ''), '0'), ',') }} %</td><td class="num">{{ $money($invoice->vat_cents) }}</td></tr>
        <tr class="total"><td>Total</td><td class="num">{{ $money($invoice->amount_cents) }}</td></tr>
    </table>

    <div class="footer">
        @if ($invoice->notes)
            <div class="notes">{{ $invoice->notes }}</div>
        @endif
        Paiement par virement sur {{ $company['bank'] }}, IBAN {{ $company['iban'] }}, en {{ $invoice->currency->value }}.
    </div>
</body>
</html>
