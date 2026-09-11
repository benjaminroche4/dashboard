import { Camera, UserRound } from 'lucide-react';
import { Form, Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { FormSection } from '@/components/form-section';
import { AvatarUpload } from '@/components/settings/avatar-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/phone-input';
import { Spinner } from '@/components/ui/spinner';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    errors: Record<string, string>;
};

export default function Profile() {
    const { auth, errors } = usePage<PageProps>().props;
    // Le numéro complet (indicatif + national) part dans un champ caché ; le champ visible ne porte que le national.
    const [phone, setPhone] = useState(auth.user.phone ?? '');

    return (
        <>
            <Head title="Profil" />

            <FormSection
                title="Photo de profil"
                hint="Elle apparaît dans le menu et auprès des autres membres"
                icon={Camera}
            >
                <AvatarUpload user={auth.user} error={errors.avatar} />
            </FormSection>

            <FormSection
                title="Profil"
                hint="Modifiez votre nom, votre adresse e-mail et votre téléphone"
                icon={UserRound}
            >
                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nom</Label>
                                    <Input
                                        id="name"
                                        className="bg-background"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Nom complet"
                                        aria-invalid={Boolean(errors.name)}
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        Adresse e-mail
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="bg-background"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Adresse e-mail"
                                        aria-invalid={Boolean(errors.email)}
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="phone">
                                        Téléphone (pour les alertes par SMS)
                                    </Label>
                                    <PhoneInput
                                        id="phone"
                                        name="phone_national"
                                        value={phone}
                                        onChange={setPhone}
                                    />
                                    <input
                                        type="hidden"
                                        name="phone"
                                        value={phone}
                                    />
                                    <p className="text-muted-foreground text-sm">
                                        Vous recevrez un SMS quand un lead qui
                                        vous est attribué attend un premier
                                        contact depuis plus de 30 minutes.
                                    </p>
                                    <InputError message={errors.phone} />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    {processing && <Spinner />}
                                    Enregistrer
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </FormSection>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profil',
            href: edit(),
        },
    ],
};
