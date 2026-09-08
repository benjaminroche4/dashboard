import { Form } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <section
            aria-label="Codes de récupération"
            className="bg-background rounded-lg border p-4"
        >
            <div className="flex items-start gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <LockKeyhole
                        className="text-muted-foreground size-4"
                        aria-hidden
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium">
                        Codes de récupération
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        Ils permettent de retrouver l’accès à votre compte si
                        vous perdez votre téléphone. Conservez-les dans un
                        gestionnaire de mots de passe.
                    </p>
                </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 select-none sm:flex-row sm:items-center sm:justify-between">
                <Button
                    variant="outline"
                    onClick={toggleCodesVisibility}
                    className="w-fit"
                    aria-expanded={codesAreVisible}
                    aria-controls="recovery-codes-section"
                >
                    <RecoveryCodeIconComponent aria-hidden />
                    {codesAreVisible ? 'Masquer' : 'Afficher'} les codes
                </Button>

                {canRegenerateCodes && (
                    <Form
                        {...regenerateRecoveryCodes.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={fetchRecoveryCodes}
                    >
                        {({ processing }) => (
                            <Button
                                variant="ghost"
                                type="submit"
                                disabled={processing}
                                aria-describedby="regenerate-warning"
                            >
                                <RefreshCw aria-hidden /> Régénérer les codes
                            </Button>
                        )}
                    </Form>
                )}
            </div>
            <div
                id="recovery-codes-section"
                className={`relative overflow-hidden transition-all duration-300 ${codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                aria-hidden={!codesAreVisible}
            >
                <div className="mt-3 space-y-3">
                    {errors?.length ? (
                        <AlertError errors={errors} />
                    ) : (
                        <>
                            <div
                                ref={codesSectionRef}
                                className="bg-muted grid grid-cols-1 gap-1 rounded-lg p-4 font-mono text-sm sm:grid-cols-2"
                                role="list"
                                aria-label="Liste des codes de récupération"
                            >
                                {recoveryCodesList.length ? (
                                    recoveryCodesList.map((code, index) => (
                                        <div
                                            key={index}
                                            role="listitem"
                                            className="select-text"
                                        >
                                            {code}
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        className="space-y-2 sm:col-span-2"
                                        aria-label="Chargement des codes de récupération"
                                    >
                                        {Array.from(
                                            { length: 8 },
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-muted-foreground/20 h-4 animate-pulse rounded"
                                                    aria-hidden="true"
                                                />
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>

                            <p
                                id="regenerate-warning"
                                className="text-muted-foreground text-xs select-none"
                            >
                                Chaque code ne peut être utilisé qu’une seule
                                fois. S’il vous en faut d’autres, cliquez sur «
                                Régénérer les codes ».
                            </p>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
