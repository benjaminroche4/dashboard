<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Dossier · {{ $request->fullName() }}</title>
    <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #0a0a0a; line-height: 1.45; margin: 0; }
        h1 { font-size: 18pt; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        h2 { font-size: 12pt; font-weight: 600; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
        h3 { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #737373; margin: 14px 0 4px; }
        strong { font-weight: 600; }
        .muted { color: #737373; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .brand { margin-bottom: 4px; line-height: 18px; }
        .brand strong { font-size: 12pt; display: inline-block; vertical-align: middle; line-height: 18px; }
        .logo { width: 18px; height: 18px; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px; }
        .label { font-size: 8pt; text-transform: uppercase; color: #737373; margin-bottom: 4px; }
        .meta { text-align: right; }
        .role { display: inline-block; font-size: 8pt; text-transform: uppercase; color: #7a1f2b; border: 1px solid #e8c9ce; border-radius: 999px; padding: 1px 8px; margin-left: 8px; vertical-align: middle; }
        ul { list-style: none; margin: 0; padding: 0; }
        li { display: table; width: 100%; padding: 5px 0; border-bottom: 1px solid #f0f0f0; break-inside: avoid; }
        li > span { display: table-cell; vertical-align: top; }
        /* Cellule de 21px : la puce et son espace, `gap` n'étant pas supporté par DocRaptor. */
        .mark { width: 21px; color: #15803d; }
        .count { width: 70px; text-align: right; color: #737373; font-size: 9.5pt; }
        .missing li { color: #a3a3a3; }
        .missing .mark { color: #a3a3a3; }
        .letter { margin: 8px 0 14px; line-height: 1.55; }
        .figures { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 6px -8px 10px; }
        .figures td { width: 33.33%; padding: 0; vertical-align: top; }
        .figure { background: #f5f5f5; border-radius: 8px; padding: 10px 12px; min-height: 64px; }
        .figure .value { font-size: 13pt; font-weight: 600; letter-spacing: -0.01em; }
        .figure .value.empty { color: #a3a3a3; font-weight: 500; font-size: 10.5pt; }
        .figure .detail { font-size: 8.5pt; color: #737373; margin-top: 2px; }
        .figure .line { display: table; width: 100%; font-size: 9pt; margin-top: 4px; border-top: 1px solid #e5e5e5; padding-top: 3px; }
        .figure .line > span { display: table-cell; }
        .figure .amount { text-align: right; font-weight: 600; }
        .highlights li { border-bottom: 0; padding: 2px 0; font-weight: 600; }
        .highlights .mark { color: #7a1f2b; font-size: 7pt; }
        .summary { background: #f5f5f5; border-radius: 8px; padding: 12px 14px; margin: 16px 0; }
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
            <h1>Dossier de location</h1>
            <div class="muted">{{ now()->locale('fr')->translatedFormat('j F Y') }}</div>
        </div>
    </div>

    <div class="label">Dossier de</div>
    <div><strong>{{ $request->fullName() }}</strong></div>

    @if ($brief !== null && $brief['summary'] !== '')
        {{-- Profil rédigé par l'assistant sur les pièces validées : il prime sur la lettre, qui reste sans lui. --}}
        <h2>Profil des locataires</h2>

        {{-- Les cartes salaires, imposition, épargne : seulement celles que les pièces renseignent. `gap` n'étant pas supporté, le `border-spacing` fait l'espace. --}}
        @if (array_filter(array_column($brief['figures'], 'value')) !== [])
        <table class="figures">
            <tr>
                @foreach (['salary' => 'Salaires', 'taxes' => 'Imposition', 'savings' => 'Épargne'] as $key => $title)
                    @continue($brief['figures'][$key]['value'] === null)
                    @php $figure = $brief['figures'][$key]; @endphp
                    <td>
                        <div class="figure">
                            <div class="label">{{ $title }}</div>
                            <div class="value">{{ $figure['value'] }}</div>
                            @if ($figure['detail'] !== null)
                                <div class="detail">{{ $figure['detail'] }}</div>
                            @endif
                            @foreach ($figure['breakdown'] as $line)
                                <div class="line"><span>{{ $line['label'] }}</span><span class="amount">{{ $line['value'] }}</span></div>
                            @endforeach
                        </div>
                    </td>
                @endforeach
            </tr>
        </table>
        @endif

        <div class="letter">{!! nl2br(e($brief['summary'])) !!}</div>

        @if ($brief['highlights'] !== [])
            <h3>Points forts</h3>
            <ul class="highlights">
                @foreach ($brief['highlights'] as $highlight)
                    <li><span class="mark">&#9679;</span><span>{{ $highlight }}</span></li>
                @endforeach
            </ul>
        @endif
    @elseif (! empty($request->presentation_letter))
        <h2>Présentation du dossier</h2>
        <div class="letter">{!! nl2br(e($request->presentation_letter)) !!}</div>
    @endif

    @foreach ($persons as $person)
        <h2>{{ $person['name'] }}<span class="role">{{ $person['role'] }}</span></h2>

        @if ($person['received'] === [])
            <p class="muted">Aucune pièce reçue pour cette personne.</p>
        @else
            @foreach ($person['sections'] as $section)
                <h3>{{ $section['label'] }}</h3>
                <ul>
                    @foreach ($section['documents'] as $document)
                        <li>
                            <span class="mark">&#10003;</span>
                            <span>{{ $document['label'] }}</span>
                            <span class="count">{{ $document['files'] }} fichier{{ $document['files'] > 1 ? 's' : '' }}</span>
                        </li>
                    @endforeach
                </ul>
            @endforeach
        @endif

        @if ($person['pending'] !== [])
            <h3>Reçues, en attente de vérification</h3>
            <ul class="missing">
                @foreach ($person['pending'] as $label)
                    <li>
                        <span class="mark">&#8230;</span>
                        <span>{{ $label }}</span>
                    </li>
                @endforeach
            </ul>
        @endif

        @if ($person['missing'] !== [])
            <h3>Pièces encore attendues</h3>
            <ul class="missing">
                @foreach ($person['missing'] as $label)
                    <li>
                        <span class="mark">&#183;</span>
                        <span>{{ $label }}</span>
                    </li>
                @endforeach
            </ul>
        @endif
    @endforeach

    <div class="footer">
        {{ $company['name'] }} · {{ $company['email'] }} · {{ $company['phone'] }}
    </div>
</body>
</html>
