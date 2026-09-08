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
                        Bonjour {{ $assignee?->name ?? '' }}, un compte rendu vous attend
                    </h2>
                    <p style="margin:0;padding:0.6em 0 0;color:#525252">
                        Votre appel vidéo avec <strong>{{ $lead->fullName() }}</strong>{{ $lead->reference ? " ({$lead->reference})" : '' }} vient d’avoir lieu. Notez vos impressions pendant qu’elles sont fraîches : elles seront recopiées dans la fiche du lead.
                    </p>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:1.2em;border:1px solid #E5E5E5;border-radius:12px">
                        <tbody>
                            <tr>
                                <td style="padding:8px 16px;color:#737373;width:40%">Appel vidéo</td>
                                <td style="padding:8px 16px;color:#171717;font-weight:600">{{ ucfirst($when) }}</td>
                            </tr>
                            @if ($lead->offer)
                                <tr>
                                    <td style="padding:8px 16px;color:#737373;border-top:1px solid #F0F0F0">Formule</td>
                                    <td style="padding:8px 16px;color:#171717;font-weight:600;border-top:1px solid #F0F0F0">{{ $lead->offer->label() }}</td>
                                </tr>
                            @endif
                            @if ($lead->email)
                                <tr>
                                    <td style="padding:8px 16px;color:#737373;border-top:1px solid #F0F0F0">E-mail</td>
                                    <td style="padding:8px 16px;color:#171717;font-weight:600;border-top:1px solid #F0F0F0">{{ $lead->email }}</td>
                                </tr>
                            @endif
                            @if ($lead->phone)
                                <tr>
                                    <td style="padding:8px 16px;color:#737373;border-top:1px solid #F0F0F0">Téléphone</td>
                                    <td style="padding:8px 16px;color:#171717;font-weight:600;border-top:1px solid #F0F0F0">{{ $lead->phone }}</td>
                                </tr>
                            @endif
                        </tbody>
                    </table>

                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:1.6em">
                        <tbody><tr><td style="border-radius:8px;background-color:#7f1d1d">
                            <a href="{{ $url }}" style="display:inline-block;padding:12px 20px;color:#ffffff;font-weight:600;text-decoration:none">Rédiger le compte rendu</a>
                        </td></tr></tbody>
                    </table>

                    <p style="margin:0;padding:1.6em 0 0;font-size:0.9em;color:#737373">
                        Vous recevez ce rappel parce que vous suivez ce lead.
                    </p>
                </td></tr></tbody>
            </table>
        </td></tr></tbody>
    </table>
</body>
</html>
