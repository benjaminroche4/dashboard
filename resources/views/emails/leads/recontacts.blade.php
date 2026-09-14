@php
    /** Les recontacts du jour d'un conseiller. Charte du site. */
    $overdue = $leads->filter(fn ($lead) => $lead->recontact_at->isBefore($today));
    $due = $leads->reject(fn ($lead) => $lead->recontact_at->isBefore($today));
@endphp
<x-mail-layout
    preheader="Vos recontacts du jour, et ceux qui traînent."
    :title="'Bonjour '.$assignee->name.', vos recontacts du jour'"
    :intro="$leads->count().' lead(s) à recontacter'.($overdue->isNotEmpty() ? ', dont '.$overdue->count().' en retard' : '').'.'"
>
    @foreach ([['Aujourd’hui', $due], ['En retard', $overdue]] as [$title, $group])
        @if ($group->isNotEmpty())
            <x-mail-card :heading="$title">
                @foreach ($group as $lead)
                    <p style="margin:0;padding:{{ $loop->first ? '0' : '10px' }} 0 0;font-size:1em;{{ $loop->first ? '' : 'border-top:1px solid #F0F0F0' }}">
                        <a href="{{ route('leads.show', $lead) }}" style="color:#171717;font-weight:600;text-decoration:none">{{ $lead->fullName() }}</a>
                        <span style="color:#737373"> · {{ $lead->reference }}</span><br />
                        <span style="font-size:0.95em;color:#525252">
                            {{ $lead->recontact_channel?->label() ?? 'Canal libre' }} · {{ $lead->recontact_at->translatedFormat('j F') }}@if ($lead->phone) · {{ $lead->phone }}@endif@if ($lead->email) · {{ $lead->email }}@endif
                        </span>
                    </p>
                @endforeach
            </x-mail-card>
        @endif
    @endforeach

    <x-mail-button :url="route('leads.index')">Ouvrir le kanban</x-mail-button>
</x-mail-layout>
