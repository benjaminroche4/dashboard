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
                        Un nouveau lead attend depuis {{ $minutes }} minutes
                    </h2>

                    <p style="margin:0;padding:0.6em 0 0;color:#525252">
                        {{ $lead->fullName() }} a été créé le {{ $lead->created_at?->timezone('Europe/Paris')->translatedFormat('j F à H\hi') }} et n'a encore reçu aucun contact de l'équipe.
                    </p>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:1.2em;border:1px solid #E5E5E5;border-radius:12px">
                        <tbody>
                            <tr>
                                <td style="padding:12px 16px">
                                    <a href="{{ route('leads.show', $lead) }}" style="color:#171717;font-weight:600;text-decoration:none">{{ $lead->fullName() }}</a>
                                    @if ($lead->reference)<span style="color:#737373"> · {{ $lead->reference }}</span>@endif<br />
                                    <span style="color:#525252">
                                        {{ $lead->source->label() }}
                                        @if ($lead->offer) · {{ $lead->offer->label() }} @endif
                                        @if ($lead->phone) · {{ $lead->phone }} @endif
                                        @if ($lead->email) · {{ $lead->email }} @endif
                                    </span>
                                    @if ($lead->assignee)
                                        <br /><span style="color:#525252">Suivi par {{ $lead->assignee->name }}</span>
                                    @else
                                        <br /><span style="color:#b91c1c">Non attribué</span>
                                    @endif
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p style="margin:0;padding:1.6em 0 0">
                        <a href="{{ route('leads.show', $lead) }}" style="display:inline-block;padding:10px 18px;border-radius:8px;background-color:#7f1d1d;color:#ffffff;font-weight:600;text-decoration:none">Ouvrir la fiche</a>
                    </p>
                </td></tr></tbody>
            </table>
        </td></tr></tbody>
    </table>
</body>
</html>
