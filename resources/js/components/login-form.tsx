import { Form } from '@inertiajs/react';
import { InfoIcon } from 'lucide-react';
import AlertError from '@/components/alert-error';
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
};

/**
 * Formulaire de connexion. Toute la logique (routes, erreurs, état) vit ici,
 * les pages ne font que l'habiller.
 *
 * Ordre de tabulation : e-mail, mot de passe, se souvenir, connexion
 * (ordre du DOM, aucun tabIndex positif). Les clés d'accès restent
 * disponibles dans les paramètres de sécurité, mais pas sur cet écran.
 */
export default function LoginForm({
    status,
    className,
    inputClassName,
    labelClassName,
    buttonClassName,
    submitLabel = 'Connexion',
}: LoginFormProps) {
    return (
        <div className={cn('flex flex-col gap-6', className)}>
            {status && (
                <Alert
                    role="status"
                    className="border-amber-200 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50 dark:*:data-[slot=alert-description]:text-amber-200"
                >
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
        </div>
    );
}
