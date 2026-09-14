@php
    /**
     * Récapitulatif du projet envoyé au lead, dans sa langue. C'est l'e-mail de
     * référence de la charte : titre et introduction centrés, blocs gris à
     * contenu blanc, appels à l'action bordeaux.
     */
    $card = 'background-color:#F7F7F7;border:1px solid #E5E5E5;border-radius:12px;padding:10px';
    $inner = 'background-color:#ffffff;border-radius:12px;padding:12px';
    $heading = 'margin:0;padding:8px 0 16px;font-size:15px;line-height:155%';
    $spacer = '<p style="margin:0;padding:0.5em 0;text-align:center"><br /></p>';
    $primary = 'display:inline-block;background-color:#71172e;color:#ffffff;text-decoration:none;font-weight:600;font-size:1em;padding:13px 28px;border-radius:8px';
    $t = fn (string $french, string $english): string => $fr ? $french : $english;
    $labelOf = fn (string $french): string => $fr ? $french : __($french);
    // Calculé ici : un attribut Blade ne peut pas contenir de guillemets doubles.
    $introText = $t(
        "Bonjour {$lead->first_name}, voici le récapitulatif de votre projet tel que nous l'avons compris. Ces éléments constituent une première approche de votre recherche : ils pourront être affinés à tout moment avec votre conseiller.",
        "Hello {$lead->first_name}, here is the summary of your project as we understood it. These details are a first outline of your search and can be refined with your advisor at any time.",
    );
@endphp
<x-mail-layout
    :locale="$locale"
    :preheader="$preheader"
    :title="$t('Votre projet logement', 'Your housing project')"
    :intro="$introText"
>
    @if ($recap)
        {!! $spacer !!}
        {{-- Le projet --}}
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="{{ $card }}">
            <tbody><tr><td>
                <p style="{{ $heading }}"><strong>{{ $t('Votre projet', 'Your project') }}</strong></p>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
                    <tbody>
                        <tr>
                            <td style="{{ $inner }}">
                                @if ($offerLabel)
                                    <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Formule', 'Package') }} :</span> {{ $offerLabel }}</p>
                                @endif
                                @if ($budget)
                                    <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Budget mensuel', 'Monthly budget') }} :</span> {{ $budget }}</p>
                                @endif
                                <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Emménagement souhaité', 'Desired move-in') }} :</span> {{ $moveIn }}</p>
                                @if ($lead->duration)
                                    <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t("Durée d'installation", 'Length of stay') }} :</span> {{ $labelOf($lead->duration->label()) }}</p>
                                @endif
                                @if ($lead->furnished)
                                    <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Meublé / non meublé', 'Furnishing') }} :</span> {{ $labelOf($lead->furnished->label()) }}</p>
                                @endif
                                @if ($lead->guarantors && $lead->guarantors->isNotEmpty())
                                    <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Type de garant', 'Guarantor') }} :</span> {{ $lead->guarantors->map(fn ($g) => $labelOf($g->label()))->implode(', ') }}</p>
                                @endif
                            </td>
                        </tr>
                        @if ($mapUrl)
                            <tr>
                                <td style="padding-top:10px">
                                    <img src="{{ $mapUrl }}" alt="{{ $t('Carte des quartiers souhaités', 'Map of the requested districts') }}" width="560" style="display:block;outline:none;border:none;max-width:100%;height:auto;border-radius:12px" />
                                </td>
                            </tr>
                        @endif
                        @if ($districtLabels !== [])
                            <tr>
                                <td style="padding-top:8px">
                                    <p style="margin:0;padding:0 0 4px;font-size:0.9em;color:#525252">{{ $t('Arrondissements souhaités :', 'Requested districts:') }}</p>
                                    @foreach ($districtLabels as $label)
                                        <span style="display:inline-block;background-color:#F7EDEF;border:1px solid #E3C6CD;border-radius:999px;padding:3px 12px;margin:2px 4px 2px 0;font-size:0.85em;font-weight:600;color:#71172e">{{ $label }}</span>
                                    @endforeach
                                </td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            </td></tr></tbody>
        </table>

        {!! $spacer !!}
        {{-- Coordonnées --}}
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="{{ $card }}">
            <tbody><tr><td>
                <p style="{{ $heading }}"><strong>{{ $t('Vos coordonnées', 'Your contact details') }}</strong></p>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
                    <tbody><tr><td style="{{ $inner }}">
                        <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Nom', 'Name') }} :</span> {{ $lead->fullName() }}</p>
                        <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">Email :</span> {{ $lead->email }}</p>
                        @if ($lead->phone)
                            <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Téléphone', 'Phone') }} :</span> {{ $lead->phone }}</p>
                        @endif
                        <p style="margin:0;padding:0.5em 0;font-size:1em"><span style="color:#525252">{{ $t('Référence', 'Reference') }} :</span> RIP-{{ str_pad((string) $lead->id, 5, '0', STR_PAD_LEFT) }}</p>
                    </td></tr></tbody>
                </table>
            </td></tr></tbody>
        </table>

        @if ($assigneeName)
            {!! $spacer !!}
            {{-- Conseiller --}}
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="{{ $card }}">
                <tbody><tr><td>
                    <p style="{{ $heading }}"><strong>{{ $t('Votre conseiller', 'Your advisor') }}</strong></p>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
                        <tbody><tr><td style="{{ $inner }}">
                            <p style="margin:0;padding:0.5em 0;font-size:1em"><strong style="color:#111827">{{ $assigneeName }}</strong></p>
                            <p style="margin:0;padding:0.5em 0;font-size:1em;color:#525252">{{ $t('Votre interlocuteur dédié suit votre dossier de bout en bout.', 'Your dedicated advisor follows your file end to end.') }}</p>
                            <p style="margin:0;padding:0.75em 0 0.25em">
                                <a href="{{ $mail['whatsapp_url'] }}" style="display:inline-block;background-color:#71172e;color:#ffffff;text-decoration:none;font-weight:600;font-size:0.95em;padding:10px 20px;border-radius:8px;margin:0 8px 8px 0">WhatsApp</a>
                                <a href="tel:{{ preg_replace('/[^+\d]/', '', $company['phone']) }}" style="display:inline-block;background-color:#ffffff;color:#71172e;border:1px solid #E3C6CD;text-decoration:none;font-weight:600;font-size:0.95em;padding:10px 20px;border-radius:8px;margin:0 0 8px">{{ $t('Appeler', 'Call us') }} {{ $mail['phone_display'] }}</a>
                            </p>
                        </td></tr></tbody>
                    </table>
                </td></tr></tbody>
            </table>
        @endif

        {!! $spacer !!}
        {{-- Et ensuite --}}
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="{{ $card }}">
            <tbody><tr><td>
                <p style="{{ $heading }}"><strong>{{ $t('Et ensuite ?', 'What happens next?') }}</strong></p>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
                    <tbody><tr><td style="background-color:#ffffff;border-radius:12px;padding:14px 16px">
                        @foreach ($fr ? ['Validation de votre projet avec votre conseiller', 'Sélection de biens, y compris off-market', 'Visites et remise des clés'] : ['Project validation with your advisor', 'Property selection, including off-market', 'Viewings and key handover'] as $step)
                            <p style="margin:0;padding:0.45em 0;font-size:1em"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background-color:#F7EDEF;color:#71172e;border-radius:999px;font-size:0.8em;font-weight:700;margin-right:8px;vertical-align:middle">{{ $loop->iteration }}</span>{{ $step }}</p>
                        @endforeach
                    </td></tr></tbody>
                </table>
            </td></tr></tbody>
        </table>
    @endif

    @if ($paymentUrl)
        <p style="margin:0;padding:1em 0 0.5em;text-align:center"><br /></p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
            <tbody><tr>
                <td align="center" style="padding:8px 0 28px;border-top:1px solid #efefef">
                    <p style="margin:0 auto;padding:24px 0 18px;font-size:1em;color:#525252;max-width:400px;text-align:center">
                        {{ $t("Il ne vous reste plus qu'à confirmer votre recherche pour démarrer la sélection.", 'All that remains is to confirm your search to start the selection.') }}
                    </p>
                    <a href="{{ $paymentUrl }}" style="{{ $primary }}">{{ $fr ? 'Confirmer ma formule '.$offerLabel : 'Confirm my '.$offerLabel.' package' }}</a>
                    <p style="margin:0;padding:12px 0 0;font-size:0.85em;color:#9ca3af">
                        {{ $t('Paiement sécurisé via Stripe', 'Secure payment via Stripe') }} · {{ $deposit ? $t('Acompte de 50 % sur ', '50% deposit on ') : '' }}{{ $offerPrice }}
                    </p>
                    <p style="margin:0;padding:26px 0 0;font-size:0.8em;color:#9ca3af;letter-spacing:0.01em">
                        {{ $t('+900 installations réussies · Biens off-market ·', '+900 successful relocations · Off-market listings ·') }}
                        <a href="{{ $mail['reviews_url'] }}" style="color:#9ca3af;text-decoration:underline">{{ $t('+400 avis Google', '+400 Google reviews') }}</a>
                    </p>
                </td>
            </tr></tbody>
        </table>
    @endif

    @if ($contractUrl)
        <p style="margin:0;padding:1em 0 0.5em;text-align:center"><br /></p>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
            <tbody><tr>
                <td align="center" style="padding:8px 0 28px;border-top:1px solid #efefef">
                    <p style="margin:0 auto;padding:24px 0 18px;font-size:1em;color:#525252;max-width:400px;text-align:center">
                        {{ $t('Votre contrat est prêt : une signature électronique suffit.', 'Your contract is ready: an electronic signature is all it takes.') }}
                    </p>
                    <a href="{{ $contractUrl }}" style="{{ $primary }}">{{ $t('Signer mon contrat', 'Sign my contract') }}</a>
                    <p style="margin:0;padding:12px 0 0;font-size:0.85em;color:#9ca3af">{{ $t('Signature électronique via Yousign', 'Electronic signature via Yousign') }}</p>
                </td>
            </tr></tbody>
        </table>
    @endif
</x-mail-layout>
