import { Head } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import LoginForm from '@/components/login-form';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    return (
        <>
            <Head title="Log in" />

            <div className="bg-background grid min-h-svh lg:grid-cols-2">
                <div className="flex items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-xs space-y-8">
                        <div className="flex items-center gap-2">
                            <AppLogoIcon className="text-foreground size-7 fill-current" />
                            <span className="font-medium">Dashboard</span>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-medium tracking-tight text-balance">
                                Log in to your account
                            </h1>
                            <p className="text-muted-foreground text-sm text-pretty">
                                Enter your email and password below to log in
                            </p>
                        </div>
                        <LoginForm status={status} />
                    </div>
                </div>

                <div className="hidden p-4 lg:sticky lg:top-0 lg:block lg:h-svh">
                    <img
                        src="/images/login.svg"
                        alt=""
                        className="size-full rounded-3xl object-cover"
                    />
                </div>
            </div>
        </>
    );
}
