@php
    /**
     * Faits d'un e-mail : « Bien / 12 rue Oberkampf », une paire par ligne,
     * séparées d'un filet. Les valeurs vides sont omises — une ligne « — »
     * n'apprend rien.
     *
     * @var array<string, string|null> $rows
     */
    $rows = array_filter($rows ?? [], fn (?string $value): bool => $value !== null && trim($value) !== '');
@endphp
@if ($rows !== [])
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tbody>
            @foreach ($rows as $label => $value)
                <tr>
                    <td style="padding:8px 0;color:#737373;width:42%;{{ $loop->first ? '' : 'border-top:1px solid #F0F0F0' }}">{{ $label }}</td>
                    <td style="padding:8px 0;color:#171717;font-weight:600;{{ $loop->first ? '' : 'border-top:1px solid #F0F0F0' }}">{{ $value }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endif
