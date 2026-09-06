import { Form } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Panel } from '@/components/panel';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function ManageTwoFactor(props: Props) {
    const requiresConfirmation = props.requiresConfirmation ?? false;
    const twoFactorEnabled = props.twoFactorEnabled ?? false;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    if (!(props.canManageTwoFactor ?? false)) {
        return null;
    }

    return (
        <Panel
            title="Authentification à deux facteurs"
            description="Un code temporaire en plus du mot de passe à la connexion"
            action={
                twoFactorEnabled ? (
                    <Badge
                        variant="secondary"
                        className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                        <ShieldCheck className="size-3" aria-hidden />
                        Activée
                    </Badge>
                ) : (
                    <Badge variant="secondary">Désactivée</Badge>
                )
            }
        >
            {twoFactorEnabled ? (
                <div className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-muted-foreground max-w-md text-sm">
                            Un code aléatoire vous sera demandé à la connexion.
                            Vous le trouverez dans votre application
                            d’authentification (TOTP) sur votre téléphone.
                        </p>
                        <Form {...disable.form()}>
                            {({ processing }) => (
                                <Button
                                    variant="outline"
                                    type="submit"
                                    disabled={processing}
                                    className="text-destructive hover:text-destructive"
                                >
                                    Désactiver la 2FA
                                </Button>
                            )}
                        </Form>
                    </div>

                    <TwoFactorRecoveryCodes
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-muted-foreground max-w-md text-sm">
                        Une fois activée, un code vous sera demandé à la
                        connexion. Ce code est fourni par une application
                        d’authentification (TOTP) sur votre téléphone.
                    </p>

                    {hasSetupData ? (
                        <Button onClick={() => setShowSetupModal(true)}>
                            <ShieldCheck />
                            Poursuivre la configuration
                        </Button>
                    ) : (
                        <Form
                            {...enable.form()}
                            onSuccess={() => setShowSetupModal(true)}
                        >
                            {({ processing }) => (
                                <Button type="submit" disabled={processing}>
                                    <ShieldCheck />
                                    Activer la 2FA
                                </Button>
                            )}
                        </Form>
                    )}
                </div>
            )}

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </Panel>
    );
}
