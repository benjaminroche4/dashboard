@php
    /** Lien de dépôt des pièces, charte du site (voir resources/views/components/mail-layout.blade.php). */
    $fr = app()->getLocale() !== 'en';
    $t = fn (string $french, string $english): string => $fr ? $french : $english;
    $intro = $t(
        'Bonjour '.$request->first_name.', voici votre page sécurisée pour transmettre les pièces de votre dossier de location. Elle n’exige aucun compte.',
        'Hello '.$request->first_name.', here is your secure page to send the documents for your rental file. No account required.',
    );
@endphp
<x-mail-layout
    :locale="app()->getLocale()"
    :preheader="$t(
        'Déposez vos pièces en ligne, avec votre code d’appairage.',
        'Upload your documents online, with your pairing code.',
    )"
    :title="$t('Vos pièces à déposer', 'Your documents to upload')"
    :intro="$intro"
>
    <x-mail-card :heading="$t('Votre code d’appairage', 'Your pairing code')">
        <p style="margin:0;padding:0.5em 0;font-size:1em;color:#525252;text-align:center">
            {{ $t('La page vous le demandera à l’ouverture.', 'The page will ask for it when it opens.') }}
        </p>
        <p style="margin:0;padding:0.25em 0 0.5em;font-size:1.9em;line-height:1.2;letter-spacing:0.28em;font-weight:700;text-align:center;color:#71172e">
            {{ $request->access_code }}
        </p>
    </x-mail-card>

    @if ($request->message)
        <x-mail-card :heading="$t('Le mot de votre conseiller', 'A word from your advisor')">
            <p style="margin:0;padding:0.25em 0;font-size:1em;white-space:pre-line">{{ $request->message }}</p>
        </x-mail-card>
    @endif

    <x-mail-card :heading="$t('Comment ça se passe', 'How it works')">
        @foreach ($fr
            ? ['Ouvrez votre page et saisissez le code', 'Déposez chaque pièce au format PDF', 'Nous vérifions et revenons vers vous']
            : ['Open your page and enter the code', 'Upload each document as a PDF', 'We check them and get back to you'] as $step)
            <p style="margin:0;padding:0.45em 0;font-size:1em"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background-color:#F7EDEF;color:#71172e;border-radius:999px;font-size:0.8em;font-weight:700;margin-right:8px;vertical-align:middle">{{ $loop->iteration }}</span>{{ $step }}</p>
        @endforeach
    </x-mail-card>

    <p style="margin:0;padding:1em 0 0.5em;text-align:center"><br /></p>

    <x-mail-button
        :url="$url"
        :lead="$t('Vos pièces restent privées : seule notre équipe y a accès.', 'Your documents stay private: only our team can see them.')"
        :note="$t('Fichiers PDF, 10 Mo maximum par pièce.', 'PDF files, 10 MB maximum per document.')"
    >{{ $t('Déposer mes pièces', 'Upload my documents') }}</x-mail-button>

    <p style="margin:0;padding:0;font-size:0.85em;text-align:center;color:#9ca3af">
        {{ $t('Si le bouton ne fonctionne pas, copiez ce lien :', 'If the button does not work, copy this link:') }}<br />
        <a href="{{ $url }}" style="color:#9ca3af;word-break:break-all">{{ $url }}</a>
    </p>
</x-mail-layout>
