<!DOCTYPE html>
<html lang="{{ $fr ? 'fr' : 'en' }}">
<head>
    <meta charset="utf-8">
    <title>{{ __('Pièces à fournir') }} · {{ $request->fullName() }}</title>
    <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #0a0a0a; line-height: 1.45; margin: 0; }
        h1 { font-size: 18pt; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
        h2 { font-size: 12pt; font-weight: 600; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; }
        h3 { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #737373; margin: 14px 0 2px; }
        strong { font-weight: 600; }
        .muted { color: #737373; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .brand { margin-bottom: 4px; line-height: 18px; }
        .brand strong { font-size: 12pt; display: inline-block; vertical-align: middle; line-height: 18px; }
        .logo { width: 18px; height: 18px; border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 8px; }
        .divider { border-top: 1px solid #e5e5e5; margin-top: 6px; padding-top: 6px; }
        .label { font-size: 8pt; text-transform: uppercase; color: #737373; margin-bottom: 4px; }
        .meta { text-align: right; }
        .message { background: #f5f5f5; border-radius: 8px; padding: 12px 14px; margin: 16px 0; white-space: pre-line; }
        .role { display: inline-block; font-size: 8pt; text-transform: uppercase; color: #7a1f2b; border: 1px solid #e8c9ce; border-radius: 999px; padding: 1px 8px; margin-left: 8px; vertical-align: middle; }
        ul { list-style: none; margin: 0; padding: 0; }
        li { display: table; width: 100%; padding: 6px 0; border-bottom: 1px solid #f0f0f0; break-inside: avoid; }
        li > span { display: table-cell; vertical-align: top; }
        /* Cellule de 21px : case de 11px + 10px d'espace avant le libellé (gap non supporté par DocRaptor). */
        .box { width: 21px; }
        .box::before { content: ''; display: block; width: 11px; height: 11px; border: 1px solid #a3a3a3; border-radius: 2px; margin-top: 3px; }
        .hint { color: #737373; font-size: 9.5pt; }
        .link { margin-top: 24px; padding: 14px; border: 1px solid #e5e5e5; border-radius: 8px; break-inside: avoid; }
        .link a { color: #7a1f2b; word-break: break-all; }
        .footer { margin-top: 28px; border-top: 1px solid #e5e5e5; padding-top: 10px; font-size: 9pt; color: #737373; }
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
        </div>
        <div class="meta">
            <h1>{{ __('Pièces à fournir') }}</h1>
            <div class="muted">{{ $request->created_at?->locale($fr ? 'fr' : 'en')->translatedFormat($fr ? 'j F Y' : 'F j, Y') }}</div>
        </div>
    </div>

    <div class="label">{{ __('Dossier de') }}</div>
    <div><strong>{{ $request->fullName() }}</strong></div>

    @if ($request->message)
        <div class="message">{{ $request->message }}</div>
    @else
        <p>{{ __('Bonjour :name,', ['name' => $request->first_name]) }}<br>{{ __('Merci de réunir les pièces ci-dessous pour constituer votre dossier de location.') }}</p>
    @endif

    @foreach ($persons as $index => $person)
        <h2>{{ $person['name'] !== '' ? $person['name'] : __('Personne :n', ['n' => $index + 1]) }}<span class="role">{{ $person['role'] }}</span></h2>
        @foreach ($person['categories'] as $category)
            <h3>{{ $category['label'] }}</h3>
            <ul>
                @foreach ($category['documents'] as $document)
                    <li>
                        <span class="box"></span>
                        <span>
                            <strong>{{ $document['label'] }}</strong>
                            @if ($document['hint'])
                                <br><span class="hint">{{ $document['hint'] }}</span>
                            @endif
                        </span>
                    </li>
                @endforeach
            </ul>
        @endforeach
    @endforeach

    <div class="link">
        <div class="label">{{ __('Où déposer vos pièces') }}</div>
        <div>{{ __('Déposez vos documents via ce lien sécurisé :') }}</div>
        <a href="{{ $request->publicUrl() }}">{{ $request->publicUrl() }}</a>
        <div>{{ __('Code d’appairage à saisir sur la page :') }} <strong style="letter-spacing: 3px;">{{ $request->access_code }}</strong></div>
        @if ($request->upload_url)
            <div>{{ __('Ou, si vous préférez, dans ce dossier partagé :') }}</div>
            <a href="{{ $request->upload_url }}">{{ $request->upload_url }}</a>
        @endif
    </div>

    <div class="footer">
        <div class="pre">{{ $company['name'] }} · {{ $company['email'] }} · {{ $company['phone'] }}</div>
    </div>
</body>
</html>
