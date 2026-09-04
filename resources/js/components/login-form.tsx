import { Form } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store } from '@/routes/login';

export type LoginFormProps = {
    status?: string;
    className?: string;
    inputClassName?: string;
    labelClassName?: string;
    buttonClassName?: string;
    submitLabel?: string;
    /** Affiche le bouton passkey au-dessus du formulaire. */
    passkey?: boolean;
};

/**
 * Formulaire de connexion. Toute la logique (routes, erreurs, état) vit ici,
 * les pages ne font que l'habiller.
 */
export default function LoginForm({
    status,
    className,
    inputClassName,
    labelClassName,
    buttonClassName,
    submitLabel = 'Log in',
    passkey = true,
}: LoginFormProps) {
    return (
        <div className={cn('flex flex-col gap-6', className)}>
            {passkey && <PasskeyVerify />}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="grid gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email" className={labelClassName}>
                                Email address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="email@example.com"
                                className={inputClassName}
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="password"
                                className={labelClassName}
                            >
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="Password"
                                className={inputClassName}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                tabIndex={3}
                            />
                            <Label
                                htmlFor="remember"
                                className={labelClassName}
                            >
                                Remember me
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className={cn('mt-2 w-full', buttonClassName)}
                            tabIndex={4}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            {submitLabel}
                        </Button>
                    </>
                )}
            </Form>

            {status && (
                <p className="text-center text-sm font-medium text-green-600">
                    {status}
                </p>
            )}
        </div>
    );
}
