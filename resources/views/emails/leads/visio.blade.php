@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
    $t = fn (string $french, string $english): string => $fr ? $french : $english;
    $with = $agentName ?? $t('notre équipe', 'our team');
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
                                {{ $mode === 'rescheduled' ? $t('Votre appel vidéo est déplacé', 'Your video call has been rescheduled') : $t('Votre appel vidéo est confirmé', 'Your video call is confirmed') }}
                            </h2>

                            <p style="margin:0;padding:0.6em 0 0;font-size:1em;text-align:center;color:#525252">
                                {{ $t('Bonjour', 'Hello') }} {{ $lead->first_name }},
                                {{ $mode === 'rescheduled'
                                    ? $t("votre appel vidéo avec {$with} change de créneau. Voici le nouveau rendez-vous :", "your video call with {$with} has been moved. Here is the new slot:")
                                    : $t("votre appel vidéo avec {$with} est bien planifié. Voici l'essentiel :", "your video call with {$with} is scheduled. Here is what you need:") }}
                            </p>

                            <p style="margin:0;padding:0.6em 0;text-align:center"><br /></p>

                            {{-- Date et heure en très gros, fuseau explicite pour les prospects à l'étranger. --}}
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#F7F7F7;border:1px solid #E5E5E5;border-radius:12px">
                                <tbody><tr>
                                    <td align="center" style="padding:24px 16px">
                                        <p style="margin:0;padding:0;font-size:0.8em;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">{{ $t('Appel découverte', 'Discovery call') }}</p>
                                        <p style="margin:0;padding:0.35em 0 0;font-size:1.9em;font-weight:700;line-height:1.2;color:#111827">{{ $dateBig }}</p>
                                        <p style="margin:0;padding:0.15em 0 0;font-size:1.5em;font-weight:700;line-height:1.3;color:#71172e">
                                            {{ $timeBig }}
                                            <span style="font-size:0.55em;font-weight:500;color:#6b7280">{{ $t('(heure de Paris)', '(Paris time)') }}</span>
                                        </p>
                                        <p style="margin:0;padding:0.7em 0 0;font-size:0.9em;color:#525252">
                                            {{ $t('Avec', 'With') }} <strong style="color:#111827">{{ $with }}</strong> &middot; {{ $duration }} min &middot; Google Meet
                                        </p>
                                    </td>
                                </tr></tbody>
                            </table>

                            @if ($meetLink)
                                <p style="margin:0;padding:0.6em 0;text-align:center"><br /></p>
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
                                    <tbody><tr>
                                        <td align="center">
                                            <a href="{{ $meetLink }}" style="display:inline-block;background-color:#71172e;color:#ffffff;text-decoration:none;font-weight:600;font-size:1em;padding:14px 28px;border-radius:8px">{{ $t("Rejoindre l'appel vidéo", 'Join the video call') }}</a>
                                        </td>
                                    </tr></tbody>
                                </table>
                            @endif

                            @if ($calendarLinks !== [])
                                <p style="margin:0;padding:0.8em 0 0;font-size:0.9em;text-align:center;color:#6b7280">
                                    {{ $t('Ajouter à votre agenda :', 'Add to your calendar:') }}
                                    @foreach ($calendarLinks as $label => $url)
                                        <a href="{{ $url }}" style="color:#71172e;text-decoration:underline">{{ $label }}</a>@if (! $loop->last) &middot; @endif
                                    @endforeach
                                </p>
                            @endif

                            <p style="margin:0;padding:0.8em 0 0;font-size:0.95em;text-align:center;color:#525252">
                                {{ $t("L'invitation en pièce jointe ajoute le rendez-vous à votre agenda en un clic. Besoin de changer l'horaire ? Répondez simplement à cet email.", 'The attached invitation adds the meeting to your calendar in one click. Need to reschedule? Just reply to this email.') }}
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
