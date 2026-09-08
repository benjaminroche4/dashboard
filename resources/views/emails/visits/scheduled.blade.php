@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
    $t = fn (string $french, string $english): string => $fr ? $french : $english;
    $with = $agentName !== null ? $agentName.($agencyName !== null ? " ({$agencyName})" : '') : ($advisorName ?? $t('notre équipe', 'our team'));
@endphp
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="{{ $fr ? 'fr' : 'en' }}">
<head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta content="width=device-width" name="viewport" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
</head>
<body>
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
        <tbody><tr><td>
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="font-family:{{ $font }};font-size:1.077em;min-height:100%;line-height:155%">
                <tbody><tr><td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="max-width:600px;width:100%;padding:40px 20px;border:1px solid #e2e2e2;border-radius:12px;background-color:#ffffff;font-family:{{ $font }}">
                        <tbody><tr><td>
                            <img src="{{ $mail['logo_url'] }}" alt="Logo Relocation in Paris" width="166" height="38" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:0" />

                            <p style="margin:0;padding:0.5em 0"><br /></p>

                            <h2 style="margin:0;padding:0.389em 0 0;font-size:1.8em;line-height:1.44;font-weight:600;text-align:center">
                                {{ $t('Votre visite est confirmée', 'Your viewing is confirmed') }}
                            </h2>

                            <p style="margin:0;padding:0.6em 0 0;font-size:1em;text-align:center;color:#525252">
                                {{ $t('Bonjour', 'Hello') }} {{ $lead->first_name }},
                                {{ $t("votre visite est bien planifiée. Voici l'essentiel :", 'your viewing is scheduled. Here is what you need:') }}
                            </p>

                            <p style="margin:0;padding:0.6em 0;text-align:center"><br /></p>

                            {{-- Date, heure et adresse en très gros, fuseau explicite pour les clients à l'étranger. --}}
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#F7F7F7;border:1px solid #E5E5E5;border-radius:12px">
                                <tbody><tr>
                                    <td align="center" style="padding:24px 16px">
                                        <p style="margin:0;padding:0;font-size:0.8em;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">{{ $t('Visite du logement', 'Home viewing') }}</p>
                                        <p style="margin:0;padding:0.35em 0 0;font-size:1.9em;font-weight:700;line-height:1.2;color:#111827">{{ $dateBig }}</p>
                                        <p style="margin:0;padding:0.15em 0 0;font-size:1.5em;font-weight:700;line-height:1.3;color:#71172e">
                                            {{ $timeBig }}
                                            <span style="font-size:0.55em;font-weight:500;color:#6b7280">{{ $t('(heure de Paris)', '(Paris time)') }}</span>
                                        </p>
                                        <p style="margin:0;padding:0.7em 0 0;font-size:1em;font-weight:600;color:#111827">{{ $property->label() }}</p>
                                        <p style="margin:0;padding:0.2em 0 0;font-size:0.95em;color:#525252">{{ $address }}</p>
                                        <p style="margin:0;padding:0.7em 0 0;font-size:0.9em;color:#525252">
                                            {{ $t('Avec', 'With') }} <strong style="color:#111827">{{ $with }}</strong>
                                        </p>
                                    </td>
                                </tr></tbody>
                            </table>

                            @if ($calendarLinks !== [])
                                <p style="margin:0;padding:0.8em 0 0;font-size:0.9em;text-align:center;color:#6b7280">
                                    {{ $t('Ajouter à votre agenda :', 'Add to your calendar:') }}
                                    @foreach ($calendarLinks as $label => $url)
                                        <a href="{{ $url }}" style="color:#71172e;text-decoration:underline">{{ $label }}</a>@if (! $loop->last) &middot; @endif
                                    @endforeach
                                </p>
                            @endif

                            <p style="margin:0;padding:0.8em 0 0;font-size:0.95em;text-align:center;color:#525252">
                                {{ $t("L'invitation en pièce jointe ajoute la visite à votre agenda en un clic. Un empêchement ? Répondez simplement à cet email.", 'The attached invitation adds the viewing to your calendar in one click. Cannot make it? Just reply to this email.') }}
                            </p>

                            <p style="margin:0;padding:0.75em 0;text-align:center"><br /></p>
                            <p style="margin:0;padding:0;font-size:0.9em;text-align:center;color:#9ca3af">Relocation in Paris</p>
                        </td></tr></tbody>
                    </table>
                </td></tr></tbody>
            </table>
        </td></tr></tbody>
    </table>
</body>
</html>
