<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Fiche du bien · {{ $property->label() }}</title>
    <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #0a0a0a; line-height: 1.45; margin: 0; }
        h1 { font-size: 18pt; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        h2 { font-size: 12pt; font-weight: 600; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
        strong { font-weight: 600; }
        .muted { color: #737373; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .brand { margin-bottom: 4px; line-height: 18px; }
        .brand strong { font-size: 12pt; display: inline-block; vertical-align: middle; line-height: 18px; }
        .logo { width: 18px; height: 18px; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px; }
        .label { font-size: 8pt; text-transform: uppercase; color: #737373; margin-bottom: 4px; }
        .meta { text-align: right; }
        .rent { background: #f5f5f5; border-radius: 8px; padding: 12px 14px; margin: 16px 0; }
        .rent .amount { font-size: 15pt; font-weight: 600; }
        .photos { margin: 16px 0 0; }
        /* Trois par ligne, en rectangle 3:2 : la largeur utile d'une A4 (182 mm)
           donne ~220 px par photo, donc ~148 px de haut. */
        .photos img { width: 32%; height: 148px; object-fit: cover; border-radius: 6px; margin: 0 1% 6px 0; display: inline-block; vertical-align: top; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 6px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        td.key { width: 40%; color: #737373; }
        .pre { white-space: pre-line; }
        .footer { margin-top: 28px; border-top: 1px solid #e5e5e5; padding-top: 10px; font-size: 9pt; color: #737373; }
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
        </div>
        <div class="meta">
            <h1>Fiche du bien</h1>
            <div class="muted">{{ now()->translatedFormat('j F Y') }}</div>
        </div>
    </div>

    <div class="label">Bien</div>
    <div><strong>{{ $property->label() }}</strong></div>
    <div class="muted">{{ trim($property->street.', '.$property->postal_code.' '.$property->city, ', ') }}</div>

    @if ($photos !== [])
        <div class="photos">
            @foreach ($photos as $photo)
                <img src="{{ $photo }}" alt="">
            @endforeach
        </div>
    @endif

    <div class="rent">
        <div class="label">Loyer mensuel</div>
        @if ($property->rent_cents !== null)
            <div class="amount">{{ number_format($property->rent_cents / 100, 2, ',', ' ') }} €</div>
            @if ($property->charges_cents !== null)
                <div class="muted">dont {{ number_format($property->charges_cents / 100, 2, ',', ' ') }} € de charges</div>
            @endif
        @else
            <div class="muted">Non renseigné</div>
        @endif
    </div>

    @if ($features !== [])
        <h2>Caractéristiques</h2>
        <table>
            @foreach ($features as $feature)
                <tr>
                    <td class="key">{{ $feature['label'] }}</td>
                    <td>{{ $feature['value'] }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    @if ($property->agent || $property->owner)
        <h2>Contacts</h2>
        <table>
            @if ($property->agent)
                <tr>
                    <td class="key">Agent immobilier</td>
                    <td>
                        <strong>{{ $property->agent->fullName() }}</strong>
                        @if ($property->agent->agency)
                            <br><span class="muted">{{ $property->agent->agency->name }}</span>
                        @endif
                        @if ($property->agent->phone)
                            <br>{{ $property->agent->phone }}
                        @endif
                    </td>
                </tr>
            @endif
            @if ($property->owner)
                <tr>
                    <td class="key">Propriétaire</td>
                    <td>
                        <strong>{{ $property->owner->fullName() }}</strong>
                        @if ($property->owner->phone)
                            <br>{{ $property->owner->phone }}
                        @endif
                    </td>
                </tr>
            @endif
        </table>
    @endif

    @if ($property->notes)
        <h2>Notes</h2>
        <div class="pre">{{ $property->notes }}</div>
    @endif

    <div class="footer">
        <div class="pre">{{ $company['name'] }} · {{ $company['email'] }} · {{ $company['phone'] }}</div>
    </div>
</body>
</html>
