import { router } from '@inertiajs/react';
import { Plus, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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

/** Cinq destinataires au plus, comme le valide `SendDocumentUploadLinkRequest`. */
export const MAX_RECIPIENTS = 5;

/**
 * Destinataires proposés à l'ouverture : les adresses du dossier quand la
 * liste est rattachée à un lead (client et second locataire), sinon le dernier
 * envoi, sinon une ligne vide à remplir.
 */
export function initialRecipients(
    leadEmails: string[],
    lastSentTo: string | null,
): string[] {
    if (leadEmails.length > 0) {
        return leadEmails.slice(0, MAX_RECIPIENTS);
    }

    const previous = (lastSentTo ?? '')
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

    return previous.length > 0 ? previous.slice(0, MAX_RECIPIENTS) : [''];
}

/**
 * Envoyer au client l'e-mail avec le lien public de dépôt et le code
 * d'appairage. Les adresses du dossier sont proposées d'office ; on peut en
 * retirer et en ajouter d'autres.
 */
export function SendUploadLinkDialog({
    requestUuid,
    leadEmails,
    lastSentTo,
    accessCode,
    open,
    onOpenChange,
}: {
    requestUuid: string;
    /** Adresses connues du lead rattaché, dans l'ordre client puis second locataire. */
    leadEmails: string[];
    lastSentTo: string | null;
    accessCode: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [emails, setEmails] = useState<string[]>(() =>
        initialRecipients(leadEmails, lastSentTo),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    // Le dialogue est monté une fois : on repart des adresses du dossier à chaque ouverture.
    useEffect(() => {
        if (open) {
            setEmails(initialRecipients(leadEmails, lastSentTo));
            setErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const setAt = (index: number, value: string) =>
        setEmails((current) =>
            current.map((email, position) =>
                position === index ? value : email,
            ),
        );

    const submit = () => {
        setErrors({});
        setProcessing(true);
        router.post(
            sendLink({ documentRequest: requestUuid }).url,
            { emails: emails.map((email) => email.trim()).filter(Boolean) },
            {
                preserveScroll: true,
                onError: (received) =>
                    setErrors(received as Record<string, string>),
                onSuccess: () => onOpenChange(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const global = errors.emails;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Envoyer le lien de dépôt</DialogTitle>
                    <DialogDescription>
                        Chaque destinataire reçoit le lien de la page de dépôt
                        et le code d’appairage {accessCode}, dans la langue de
                        la liste.
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
                        <Label htmlFor="upload-link-email-0">
                            Destinataires
                        </Label>
                        {emails.map((email, index) => (
                            <div key={index} className="grid gap-2">
                                <div className="flex items-center gap-2">
                                    <Input
                                        id={`upload-link-email-${index}`}
                                        type="email"
                                        inputMode="email"
                                        value={email}
                                        onChange={(event) =>
                                            setAt(index, event.target.value)
                                        }
                                        placeholder="client@exemple.com"
                                        aria-label={`Destinataire ${index + 1}`}
                                        required
                                        autoFocus={index === 0}
                                    />
                                    {emails.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Retirer ${email || `le destinataire ${index + 1}`}`}
                                            onClick={() =>
                                                setEmails((current) =>
                                                    current.filter(
                                                        (_, position) =>
                                                            position !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            <X aria-hidden />
                                        </Button>
                                    )}
                                </div>
                                <InputError
                                    message={errors[`emails.${index}`]}
                                />
                            </div>
                        ))}
                        <InputError message={global} />
                        {emails.length < MAX_RECIPIENTS && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-self-start"
                                onClick={() =>
                                    setEmails((current) => [...current, ''])
                                }
                            >
                                <Plus aria-hidden />
                                Ajouter un destinataire
                            </Button>
                        )}
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
