@php
    /**
     * Suivi libre à une entreprise : l'objet devient le titre, le message est
     * rendu paragraphe par paragraphe (retours à la ligne conservés). Charte du site.
     */
    $mail = config('company.mail');
    $introText = 'Bonjour '.$recipientName.',';
@endphp
<x-mail-layout :preheader="$preheader" :title="$subjectLine" :intro="$introText">
    <x-mail-card :heading="$company->name">
        @foreach ($paragraphs as $paragraph)
            <p style="margin:0;padding:0 0 12px;font-size:15px;line-height:160%;color:#171717">{!! nl2br(e($paragraph)) !!}</p>
        @endforeach
    </x-mail-card>

    {{-- Signature : un nom, une adresse, un téléphone. --}}
    <p style="margin:0;padding:1.6em 0 0;color:#525252;text-align:center">
        @if ($sender)
            <strong>{{ $sender->name }}</strong> · <a href="mailto:{{ $sender->email }}" style="color:#71172e">{{ $sender->email }}</a>
        @else
            <strong>L’équipe Relocation in Paris</strong>
        @endif
        @if (! empty($mail['phone_display']))
            · {{ $mail['phone_display'] }}
        @endif
    </p>
</x-mail-layout>
