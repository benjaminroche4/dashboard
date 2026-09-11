@php
    /**
     * Coquille commune à tous les e-mails : logo, carte blanche à bord arrondi,
     * ligne de prévisualisation et mention postale. Charte du site Relocation
     * in Paris — un seul endroit à toucher pour la faire évoluer.
     *
     * @var string $preheader   Ligne de prévisualisation en boîte de réception.
     * @var string|null $title  Titre centré, facultatif.
     * @var string|null $intro  Paragraphe d'introduction centré, facultatif.
     */
    $mail = config('company.mail');
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
@endphp
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="{{ $locale ?? app()->getLocale() }}">
<head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta content="width=device-width" name="viewport" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
</head>
<body>
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
        {{ $preheader ?? '' }}
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
        <tbody><tr><td>
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="font-family:{{ $font }};font-size:1.077em;min-height:100%;line-height:155%">
                <tbody><tr><td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="max-width:600px;width:100%;padding:40px 20px;border:1px solid #e2e2e2;border-radius:12px;background-color:#ffffff;font-family:{{ $font }}">
                        <tbody><tr><td>
                            <img src="{{ $mail['logo_url'] }}" alt="Relocation in Paris" width="166" height="38" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:0" />

                            <p style="margin:0;padding:0.5em 0"><br /></p>

                            @isset($title)
                                <h2 style="margin:0;padding:0.389em 0 0;font-size:1.8em;line-height:1.44;font-weight:600;text-align:center">{{ $title }}</h2>
                            @endisset

                            @isset($intro)
                                <p style="margin:0;padding:0.75em 0 0.5em;font-size:1em;text-align:center;color:#525252">{{ $intro }}</p>
                            @endisset

                            {{ $slot }}

                            <p style="margin:0;padding:0.75em 0"><br /></p>
                            <p style="margin:0;padding:0;font-size:0.9em;text-align:center;color:#9ca3af">{{ $mail['postal_line'] }}</p>
                        </td></tr></tbody>
                    </table>
                </td></tr></tbody>
            </table>
        </td></tr></tbody>
    </table>
</body>
</html>
