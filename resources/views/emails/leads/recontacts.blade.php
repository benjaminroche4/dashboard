@php
    $font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";
    $overdue = $leads->filter(fn ($lead) => $lead->recontact_at->isBefore($today));
    $due = $leads->reject(fn ($lead) => $lead->recontact_at->isBefore($today));
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
                        Bonjour {{ $assignee->name }}, vos recontacts du jour
                    </h2>

                    <p style="margin:0;padding:0.6em 0 0;color:#525252">
                        {{ $leads->count() }} lead(s) à recontacter{{ $overdue->isNotEmpty() ? ", dont {$overdue->count()} en retard" : '' }}.
                    </p>

                    @foreach ([['Aujourd\'hui', $due], ['En retard', $overdue]] as [$title, $group])
                        @if ($group->isNotEmpty())
                            <h3 style="margin:0;padding:1.4em 0 0.4em;font-size:1em;text-transform:uppercase;letter-spacing:0.04em;color:#737373">{{ $title }}</h3>
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #E5E5E5;border-radius:12px">
                                <tbody>
                                @foreach ($group as $lead)
                                    <tr>
                                        <td style="padding:12px 16px;border-top:{{ $loop->first ? '0' : '1px solid #E5E5E5' }}">
                                            <a href="{{ route('leads.show', $lead) }}" style="color:#171717;font-weight:600;text-decoration:none">{{ $lead->fullName() }}</a>
                                            <span style="color:#737373"> · {{ $lead->reference }}</span><br />
                                            <span style="color:#525252">
                                                {{ $lead->recontact_channel?->label() ?? 'Canal libre' }} · {{ $lead->recontact_at->translatedFormat('j F') }}
                                                @if ($lead->phone) · {{ $lead->phone }} @endif
                                                @if ($lead->email) · {{ $lead->email }} @endif
                                            </span>
                                        </td>
                                    </tr>
                                @endforeach
                                </tbody>
                            </table>
                        @endif
                    @endforeach

                    <p style="margin:0;padding:1.6em 0 0;font-size:0.9em;color:#737373">
                        <a href="{{ route('leads.index') }}" style="color:#171717">Ouvrir le kanban</a>
                    </p>
                </td></tr></tbody>
            </table>
        </td></tr></tbody>
    </table>
</body>
</html>
