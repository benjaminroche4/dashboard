@php
    /**
     * « 4 biens correspondent à votre recherche » : le chiffre en gros, ce
     * que l'équipe fait pour le lead, et un seul geste : contacter son
     * conseiller. Rien sur les biens eux-mêmes. Dans la langue du lead.
     */
    $t = fn (string $french, string $english): string => $fr ? $french : $english;
    $who = $advisorName ?? $t('votre conseiller', 'your advisor');
    $plural = $count > 1;
    $titleText = $fr
        ? ucfirst($countText).' à votre recherche'
        : ucfirst($countText).' your search';
    // Calculé ici : un attribut Blade ne peut pas contenir de guillemets doubles.
    $introText = $fr
        ? "Bonjour {$lead->first_name}, nous avons passé notre base en revue avec vos critères : ".($plural ? "{$count} logements y correspondent" : 'un logement y correspond').", et ".($plural ? 'ils ne sont' : "il n'est")." pas encore en ligne. À Paris, ".($plural ? 'ces biens partent' : 'ce type de bien part')." en quelques jours."
        : "Hello {$lead->first_name}, we went through our database with your criteria: ".($plural ? "{$count} homes match" : 'one home matches').", and ".($plural ? 'they are' : 'it is')." not online yet. In Paris, ".($plural ? 'these homes go' : 'this kind of home goes')." within days.";
    $steps = $fr ? [
        'La sélection' => 'nous ne vous montrons que ce qui vous correspond vraiment.',
        'Les visites' => "organisées pour vous, ou réalisées par nous si vous n'êtes pas encore à Paris.",
        'Le dossier' => 'préparé et présenté pour convaincre le propriétaire du premier coup.',
        'Le bail et l’installation' => "négociation, relecture, état des lieux, assurance, énergie : vous n'avez plus qu'à poser vos valises.",
    ] : [
        'The selection' => 'we only show you what truly fits your search.',
        'The visits' => 'arranged for you, or done on your behalf if you are not in Paris yet.',
        'The application' => 'prepared and presented to win the landlord over at the first try.',
        'Lease and move-in' => 'negotiation, review, inventory, insurance, energy: all you have to do is unpack.',
    ];
    $note = $advisorPhone
        ? $t("Ou répondez simplement à cet e-mail, ou appelez {$who} au {$advisorPhone}.", "Or simply reply to this email, or call {$who} on {$advisorPhone}.")
        : $t("Ou répondez simplement à cet e-mail : {$who} vous rappelle dans la journée.", "Or simply reply to this email: {$who} will call you back today.");
@endphp
<x-mail-layout
    :locale="$locale"
    :preheader="$preheader"
    :title="$titleText"
    :intro="$introText"
>
    {{-- Le chiffre, en gros, dans un bloc gris : c'est lui qu'on retient. --}}
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#F7F7F7;border:1px solid #E5E5E5;border-radius:12px">
        <tbody><tr>
            <td align="center" style="padding:24px 16px">
                <p style="margin:0;padding:0;font-size:0.8em;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">{{ $t('Dans notre base, pour vous', 'In our database, for you') }}</p>
                <p style="margin:0;padding:0.2em 0 0;font-size:2.6em;font-weight:700;line-height:1.1;color:#71172e">{{ $count }}</p>
                <p style="margin:0;padding:0.2em 0 0;font-size:1.05em;font-weight:600;color:#111827">{{ $plural ? $t('biens qui correspondent à votre recherche', 'homes matching your search') : $t('bien qui correspond à votre recherche', 'home matching your search') }}</p>
                <p style="margin:0;padding:0.6em 0 0;font-size:0.9em;color:#525252">{{ $t("Adresses, photos et visites réservées à nos clients.", 'Addresses, photos and visits reserved for our clients.') }}</p>
            </td>
        </tr></tbody>
    </table>

    <x-mail-card :heading="$t('Ce que nous faisons pour vous', 'What we do for you')">
        @foreach ($steps as $label => $text)
            <p style="margin:0;padding:6px 0;font-size:0.95em;line-height:150%;{{ $loop->first ? '' : 'border-top:1px solid #F0F0F0' }}">
                <strong style="color:#71172e">{{ $label }}</strong> <span style="color:#525252">&middot; {{ $text }}</span>
            </p>
        @endforeach
    </x-mail-card>

    <p style="margin:0;padding:1.2em 0 0.4em;font-size:1em;text-align:center;color:#171717">
        {{ $t("Un premier échange de 20 minutes avec {$who} suffit pour vous présenter ces biens et la formule qui vous convient. Sans engagement.", "A first 20-minute call with {$who} is enough to walk you through these homes and the package that suits you. No commitment.") }}
    </p>

    <x-mail-button :url="$ctaUrl" :note="$note">{{ $t('Contacter mon conseiller', 'Contact my advisor') }}</x-mail-button>
</x-mail-layout>
