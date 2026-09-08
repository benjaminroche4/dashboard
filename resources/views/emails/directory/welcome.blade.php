@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
@endphp
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="fr">
<head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta content="width=device-width" name="viewport" />
</head>
<body>
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="font-family:{{ $font }};font-size:1.077em;line-height:155%">
        <tbody><tr><td>
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="max-width:600px;width:100%;padding:40px 20px;border:1px solid #e2e2e2;border-radius:12px;background-color:#ffffff">
                <tbody><tr><td>
                    @if (! empty($mail['logo_url']))
                        <img src="{{ $mail['logo_url'] }}" alt="Logo Relocation in Paris" width="166" height="38" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%" />
                    @endif

                    <h2 style="margin:0;padding:1em 0 0;font-size:1.6em;line-height:1.4;font-weight:600">
                        Bienvenue parmi nos partenaires
                    </h2>
                    <p style="margin:0;padding:0.4em 0 0;color:#525252">
                        Bonjour {{ $name }},
                    </p>
                    <p style="margin:0;padding:0.8em 0 0;color:#525252">
                        Nous venons de vous ajouter à l’annuaire des partenaires de Relocation in Paris, en tant que <strong>{{ $category }}</strong>.
                        Nous accompagnons des personnes qui s’installent à Paris et nous vous solliciterons lorsque l’un de nos clients aura besoin de vos services.
                    </p>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:1.2em;background-color:#f5f5f5;border-radius:12px">
                        <tbody><tr><td style="padding:14px 16px;color:#171717">
                            Vos coordonnées enregistrées :
                            <strong>{{ $email }}</strong>@if ($phone) · {{ $phone }}@endif
                            <br />
                            <span style="color:#737373;font-size:0.9em">Une erreur ? Répondez simplement à cet e-mail.</span>
                        </td></tr></tbody>
                    </table>

                    <p style="margin:0;padding:1.6em 0 0;color:#525252">
                        @if ($sender)
                            Votre contact : <strong>{{ $sender->name }}</strong> · <a href="mailto:{{ $sender->email }}" style="color:#7f1d1d">{{ $sender->email }}</a>
                        @else
                            L’équipe Relocation in Paris
                        @endif
                        @if (! empty($mail['phone_display']))
                            · {{ $mail['phone_display'] }}
                        @endif
                    </p>
                    @if (! empty($mail['postal_line']))
                        <p style="margin:0;padding:1.4em 0 0;color:#a3a3a3;font-size:0.85em">{{ $mail['postal_line'] }}</p>
                    @endif
                </td></tr></tbody>
            </table>
        </td></tr></tbody>
    </table>
</body>
</html>
