import { Head } from '@inertiajs/react';
import LoginForm from '@/components/login-form';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="Connexion" />

            <div className="bg-background grid min-h-svh lg:grid-cols-2">
                <div className="flex items-center justify-center p-6 md:p-10">
                    <div className="animate-in fade-in w-full max-w-sm space-y-8 duration-500">
                        <img
                            src="/images/logo.jpg"
                            alt="Dashboard"
                            className="size-10 rounded-md"
                        />
                        <div className="space-y-1">
                            <h1 className="text-2xl font-medium tracking-tight text-balance">
                                Connectez-vous à votre compte
                            </h1>
                            <p className="text-muted-foreground text-sm text-pretty">
                                Saisissez votre e-mail et votre mot de passe
                                pour continuer
                            </p>
                        </div>
                        <LoginForm status={status} />
                    </div>
                </div>

                {/* Photo en bichromie dans le bordeaux du logo, plus sombre en thème dark. */}
                <div className="hidden p-4 lg:sticky lg:top-0 lg:block lg:h-svh">
                    <img
                        src="/images/login.jpg"
                        alt=""
                        className="size-full rounded-3xl object-cover"
                    />
                </div>
            </div>
        </>
    );
}
