import { router } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { welcome as partnerWelcome } from '@/routes/partners';
import type { PartnerContact } from '@/types';

export type WelcomeRecipient = { email: string; name: string; hint: string };

/**
 * Destinataires possibles : l'adresse du partenaire puis celles de ses
 * interlocuteurs, sans doublon. L'e-mail ne part jamais ailleurs — le serveur
 * refuse toute autre adresse.
 */
export function welcomeRecipients(
    partner: { name: string; email: string | null },
    contacts: PartnerContact[],
): WelcomeRecipient[] {
    const seen = new Set<string>();
    const recipients: WelcomeRecipient[] = [];

    if (partner.email) {
        seen.add(partner.email.toLocaleLowerCase());
        recipients.push({
            email: partner.email,
            name: partner.name,
            hint: 'Adresse du partenaire',
        });
    }

    for (const contact of contacts) {
        const key = contact.email?.toLocaleLowerCase();

        if (!contact.email || !key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        recipients.push({
            email: contact.email,
            name: contact.name,
            hint: contact.position ?? 'Interlocuteur',
        });
    }

    return recipients;
}

/** Confirmation du renvoi de l'e-mail de bienvenue, avec le choix des destinataires. */
export function PartnerWelcomeDialog({
    partnerUuid,
    recipients,
    open,
    onOpenChange,
}: {
    partnerUuid: string;
    recipients: WelcomeRecipient[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    // Par défaut, l'adresse du partenaire — la première de la liste.
    const [chosen, setChosen] = useState<string[]>(() =>
        recipients.slice(0, 1).map((recipient) => recipient.email),
    );
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setChosen(recipients.slice(0, 1).map((r) => r.email));
            setError(undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const toggle = (email: string, checked: boolean) =>
        setChosen((current) =>
            checked
                ? [...current, email]
                : current.filter((candidate) => candidate !== email),
        );

    const submit = () => {
        setError(undefined);
        setProcessing(true);
        router.post(
            partnerWelcome({ partner: partnerUuid }).url,
            { emails: chosen },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setError(
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
                    <DialogTitle>Renvoyer l’e-mail de bienvenue</DialogTitle>
                    <DialogDescription>
                        Chaque personne cochée reçoit son propre e-mail, à son
                        nom.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    {recipients.map((recipient) => (
                        <label
                            key={recipient.email}
                            className="hover:bg-accent/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                        >
                            <Checkbox
                                checked={chosen.includes(recipient.email)}
                                onCheckedChange={(state) =>
                                    toggle(recipient.email, state === true)
                                }
                                aria-label={recipient.email}
                                className="mt-0.5"
                            />
                            <span className="grid min-w-0 gap-0.5 text-sm">
                                <span className="truncate font-medium">
                                    {recipient.name}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {recipient.email} · {recipient.hint}
                                </span>
                            </span>
                        </label>
                    ))}
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
                    <Button
                        type="button"
                        disabled={processing || chosen.length === 0}
                        onClick={submit}
                    >
                        {processing ? <Spinner /> : <Send />}
                        Envoyer ({chosen.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
