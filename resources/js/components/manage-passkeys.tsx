import { router } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import { Panel } from '@/components/panel';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import { Badge } from '@/components/ui/badge';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

const EmptyState = () => {
    return (
        <div className="px-4 py-8 text-center">
            <div className="bg-muted mx-auto mb-3 flex size-10 items-center justify-center rounded-lg">
                <KeyRound
                    className="text-muted-foreground size-5"
                    aria-hidden
                />
            </div>
            <p className="text-sm font-medium">Aucune clé d’accès</p>
            <p className="text-muted-foreground mt-1 text-sm">
                Ajoutez une clé d’accès pour vous connecter sans mot de passe
            </p>
        </div>
    );
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <Panel
            title="Clés d’accès (passkeys)"
            description="Connexion sans mot de passe avec Touch ID, Face ID ou une clé physique"
            action={
                passkeys.length > 0 ? (
                    <Badge variant="secondary">
                        {passkeys.length} {passkeys.length > 1 ? 'clés' : 'clé'}
                    </Badge>
                ) : undefined
            }
        >
            <div className="grid gap-4">
                <ul
                    role="list"
                    aria-label="Clés d’accès enregistrées"
                    className="bg-background grid divide-y rounded-lg border"
                >
                    {passkeys.length > 0 ? (
                        passkeys.map((passkey) => (
                            <PasskeyItem
                                key={passkey.id}
                                passkey={passkey}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <li>
                            <EmptyState />
                        </li>
                    )}
                </ul>

                <PasskeyRegistration onSuccess={handleRegisterSuccess} />
            </div>
        </Panel>
    );
}
