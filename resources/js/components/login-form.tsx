import { Form } from '@inertiajs/react';
import { InfoIcon } from 'lucide-react';
import AlertError from '@/components/alert-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    /** Affiche le bouton de connexion par clé d'accès après le formulaire. */
    passkey?: boolean;
};

/**
 * Formulaire de connexion. Toute la logique (routes, erreurs, état) vit ici,
 * les pages ne font que l'habiller.
 *
 * Ordre de tabulation : e-mail, mot de passe, se souvenir, connexion, clé d'accès
 * (ordre du DOM, aucun tabIndex positif).
 */
export default function LoginForm({
    status,
    className,
    inputClassName,
    labelClassName,
    buttonClassName,
    submitLabel = 'Connexion',
    passkey = true,
}: LoginFormProps) {
    return (
        <div className={cn('flex flex-col gap-6', className)}>
            {status && (
                <Alert role="status">
                    <InfoIcon />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="grid gap-6"
            >
                {({ processing, errors }) => {
                    const formErrors = [errors.email, errors.password].filter(
                        (message): message is string => Boolean(message),
                    );

                    return (
                        <>
                            {formErrors.length > 0 && (
                                <AlertError
                                    errors={formErrors}
                                    title="Connexion impossible"
                                />
                            )}

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className={labelClassName}
                                >
                                    Adresse e-mail
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="email@exemple.fr"
                                    aria-invalid={Boolean(errors.email)}
                                    className={inputClassName}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className={labelClassName}
                                >
                                    Mot de passe
                                </Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="Mot de passe"
                                    aria-invalid={Boolean(errors.password)}
                                    className={inputClassName}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox id="remember" name="remember" />
                                <Label
                                    htmlFor="remember"
                                    className={labelClassName}
                                >
                                    Se souvenir de moi
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className={cn('mt-2 w-full', buttonClassName)}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                {submitLabel}
                            </Button>
                        </>
                    );
                }}
            </Form>

            {passkey && (
                <div>
                    <PasskeyVerify separator="Ou" separatorPosition="above" />
                </div>
            )}
        </div>
    );
}
