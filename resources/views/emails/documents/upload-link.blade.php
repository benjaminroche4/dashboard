<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head><meta charset="utf-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; font-size: 15px; color: #0a0a0a; line-height: 1.5;">
    <p>{{ __('Bonjour :name,', ['name' => $request->first_name]) }}</p>
    <p>{{ __('Merci de réunir les pièces ci-dessous pour constituer votre dossier de location.') }} {{ __('Vous pouvez les déposer directement, au format PDF, sur votre page sécurisée :') }}</p>
    <p style="margin: 24px 0;">
        <a href="{{ $url }}" style="display: inline-block; background: #7a1f2b; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">{{ __('Déposer mes pièces') }}</a>
    </p>
    <p>{{ __('À l’ouverture, la page vous demandera ce code d’appairage :') }}</p>
    <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; margin: 8px 0 24px;">{{ $request->access_code }}</p>
    @if ($request->message)
        <p style="white-space: pre-line; background: #f5f5f5; border-radius: 8px; padding: 12px 16px;">{{ $request->message }}</p>
    @endif
    <p style="color:#6b7280; font-size: 13px;">{{ __('Si le bouton ne fonctionne pas, copiez ce lien :') }}<br><a href="{{ $url }}" style="color:#6b7280">{{ $url }}</a></p>
    <p>{{ __('Merci de votre confiance,') }}<br>{{ $company['name'] }}<br><span style="color:#6b7280">{{ $company['email'] }} · {{ $company['phone'] }}</span></p>
</body>
</html>
