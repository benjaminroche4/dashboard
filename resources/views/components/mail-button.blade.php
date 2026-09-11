@php
    /** Appel à l'action bordeaux, centré, avec une mention discrète en dessous. */
@endphp
<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tbody><tr>
        <td align="center" style="padding:8px 0 28px;border-top:1px solid #efefef">
            @isset($lead)
                <p style="margin:0 auto;padding:24px 0 18px;font-size:1em;color:#525252;max-width:400px;text-align:center">{{ $lead }}</p>
            @endisset
            <a href="{{ $url }}" style="display:inline-block;background-color:#71172e;color:#ffffff;text-decoration:none;font-weight:600;font-size:1em;padding:13px 28px;border-radius:8px">{{ $slot }}</a>
            @isset($note)
                <p style="margin:0;padding:12px 0 0;font-size:0.85em;color:#9ca3af">{{ $note }}</p>
            @endisset
        </td>
    </tr></tbody>
</table>
