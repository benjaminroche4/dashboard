@php
    /** Relance interne : un bien visité attend la décision du client. Charte des e-mails d'équipe. */
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
    $address = implode(', ', array_filter([$property->street, trim(($property->postal_code ?? '').' '.($property->city ?? ''))]));
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
                        Bonjour {{ $member->name }}, une décision se fait attendre
                    </h2>
                    <p style="margin:0;padding:0.6em 0 0;color:#525252">
                        <strong>{{ $client->householdName() }}</strong>{{ $client->reference ? " ({$client->reference})" : '' }} a visité ce bien il y a {{ $days }} jour{{ $days > 1 ? 's' : '' }} et ne s’est pas encore positionné. À Paris, un bien qui plaît part en quelques jours : un appel maintenant vaut mieux qu’une relance la semaine prochaine.
                    </p>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:1.2em;border:1px solid #E5E5E5;border-radius:12px">
                        <tbody>
                            <tr>
                                <td style="padding:8px 16px;color:#737373;width:40%">Bien</td>
                                <td style="padding:8px 16px"><strong>{{ $property->label() }}</strong></td>
                            </tr>
                            @if ($address !== '')
                                <tr>
                                    <td style="padding:8px 16px;color:#737373">Adresse</td>
                                    <td style="padding:8px 16px">{{ $address }}</td>
                                </tr>
                            @endif
                            <tr>
                                <td style="padding:8px 16px;color:#737373">En attente depuis</td>
                                <td style="padding:8px 16px">{{ $days }} jour{{ $days > 1 ? 's' : '' }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <p style="margin:0;padding:1.6em 0 0">
                        <a href="{{ $url }}" style="display:inline-block;padding:12px 20px;border-radius:999px;background-color:#71172e;color:#ffffff;text-decoration:none;font-weight:600">Ouvrir le dossier</a>
                    </p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>
