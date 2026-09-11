@php
    /** Bloc gris arrondi de la charte : un intitulé, puis le contenu sur fond blanc. */
@endphp
<p style="margin:0;padding:0.5em 0;text-align:center"><br /></p>
<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F7F7F7;border:1px solid #E5E5E5;border-radius:12px;padding:10px">
    <tbody><tr><td>
        @isset($heading)
            <p style="margin:0;padding:8px 0 16px;font-size:15px;line-height:155%"><strong>{{ $heading }}</strong></p>
        @endisset
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
            <tbody><tr><td style="background-color:#ffffff;border-radius:12px;padding:14px 16px">
                {{ $slot }}
            </td></tr></tbody>
        </table>
    </td></tr></tbody>
</table>
