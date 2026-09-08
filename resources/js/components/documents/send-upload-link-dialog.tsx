import { router } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { sendLink } from '@/routes/tools/documents';

/**
 * Envoyer au client l'e-mail avec le lien public de dépôt et le code
 * d'appairage : destinataire prérempli avec l'e-mail du lead, modifiable.
 */
export function SendUploadLinkDialog({
    requestUuid,
    defaultEmail,
    accessCode,
    open,
    onOpenChange,
}: {
    requestUuid: string;
    defaultEmail: string | null;
    accessCode: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [email, setEmail] = useState(defaultEmail ?? '');
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        setError(undefined);
        setProcessing(true);
        router.post(
            sendLink({ documentRequest: requestUuid }).url,
            { email },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setError(
                        errors.email ??
                            Object.values(errors)[0] ??
                            "L'envoi a échoué. Réessayez dans un instant.",
                    ),
                onSuccess: () => onOpenChange(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Envoyer le lien de dépôt</DialogTitle>
                    <DialogDescription>
                        Le client reçoit le lien de sa page de dépôt et le code
                        d’appairage {accessCode}, dans sa langue.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="upload-link-email">
                            E-mail du client
                        </Label>
                        <Input
                            id="upload-link-email"
                            type="email"
                            inputMode="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="client@exemple.com"
                            required
                            autoFocus
                        />
                        <InputError message={error} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? <Spinner /> : <Send />}
                            Envoyer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
