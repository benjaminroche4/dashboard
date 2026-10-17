<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $plan['section']->label() }} · {{ $plan['person'] }}</title>
    <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #0a0a0a; line-height: 1.45; margin: 0; }
        h1 { font-size: 18pt; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        h2 { font-size: 13pt; font-weight: 600; margin: 0 0 10px; }
        h3 { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #737373; margin: 18px 0 6px; }
        strong { font-weight: 600; }
        .muted { color: #737373; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .brand { margin-bottom: 4px; line-height: 18px; }
        .brand strong { font-size: 12pt; display: inline-block; vertical-align: middle; line-height: 18px; }
        .logo { width: 18px; height: 18px; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px; }
        .meta { text-align: right; }
        .kicker { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #7a1f2b; margin-bottom: 6px; }
        .role { display: inline-block; font-size: 8pt; text-transform: uppercase; color: #7a1f2b; border: 1px solid #e8c9ce; border-radius: 999px; padding: 1px 8px; margin-left: 8px; vertical-align: middle; }
        .summary { background: #f5f5f5; border-radius: 8px; padding: 12px 14px; margin: 14px 0 0; line-height: 1.55; }
        .summary p { margin: 0 0 8px; }
        .summary p:last-child { margin-bottom: 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 5px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        td.label { width: 42%; color: #737373; }
        td.value { font-weight: 600; }
        ol { margin: 0; padding-left: 20px; }
        ol li { padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
        ol li .note { display: block; color: #525252; font-size: 9.5pt; }
        ul.caveats { margin: 0; padding-left: 18px; color: #7a1f2b; }
        ul.caveats li { padding: 3px 0; }
        .ai { font-size: 8.5pt; color: #737373; margin-top: 22px; border-top: 1px solid #e5e5e5; padding-top: 8px; }
        .footer { margin-top: 14px; font-size: 9pt; color: #737373; }
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
            <div class="muted">Dossier de {{ $request->fullName() }}</div>
        </div>
        <div class="meta">
            <h1>Fiche récapitulative</h1>
            <div class="muted">{{ now()->locale('fr')->translatedFormat('j F Y') }}</div>
        </div>
    </div>

    <div class="kicker">{{ $plan['section']->label() }}</div>
    <h2>{{ $plan['person'] }}<span class="role">{{ $plan['role'] }}</span></h2>

    @if ($brief !== null && $brief['summary'] !== null)
        <div class="muted"><strong style="color:#0a0a0a">{{ $brief['title'] }}</strong></div>
        <div class="summary">
            @foreach (preg_split('/\n\s*\n/', $brief['summary']) ?: [] as $paragraph)
                <p>{!! nl2br(e(trim($paragraph))) !!}</p>
            @endforeach
        </div>
    @else
        <div class="summary muted">Cette partie réunit les pièces listées ci-dessous, vérifiées et validées par notre équipe.</div>
    @endif

    @if ($brief !== null && $brief['facts'] !== [])
        <h3>En chiffres</h3>
        <table>
            @foreach ($brief['facts'] as $fact)
                <tr>
                    <td class="label">{{ $fact['label'] }}</td>
                    <td class="value">{{ $fact['value'] }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <h3>Pièces de cette partie, dans l’ordre</h3>
    <ol>
        @php $notes = $brief === null ? [] : array_column($brief['documents'], 'note', 'label'); @endphp
        @foreach ($plan['documents'] as $document)
            @foreach ($document['uploads'] as $upload)
                <li>
                    <strong>{{ $document['label'] }}</strong>
                    <span class="muted">· {{ $upload->original_name }}</span>
                    @if (! empty($notes[$upload->original_name]))
                        <span class="note">{{ $notes[$upload->original_name] }}</span>
                    @endif
                </li>
            @endforeach
        @endforeach
    </ol>

    @if ($brief !== null && $brief['caveats'] !== [])
        <h3>Points d’attention</h3>
        <ul class="caveats">
            @foreach ($brief['caveats'] as $caveat)
                <li>{{ $caveat }}</li>
            @endforeach
        </ul>
    @endif

    @if ($brief !== null && $brief['summary'] !== null)
        <div class="ai">Synthèse établie par notre assistant à partir des pièces jointes, puis relue par l’équipe. Les pièces font foi.</div>
    @endif

    <div class="footer">{{ $company['name'] }} · {{ $company['email'] }} · {{ $company['phone'] }}</div>
</body>
</html>
