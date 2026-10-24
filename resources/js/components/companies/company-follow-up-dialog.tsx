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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { followUp as companyFollowUp } from '@/routes/companies';
import type { CompanyContact } from '@/types';

export type FollowUpRecipient = {
    email: string;
    name: string;
    hint: string;
    /** Coché d'office : contact principal, ou l'adresse de l'entreprise à défaut. */
    preselected: boolean;
};

/** Cinq destinataires au plus, comme côté serveur. */
export const MAX_FOLLOW_UP_RECIPIENTS = 5;

/**
 * Destinataires possibles : les contacts principaux d'abord (cochés), les
 * autres contacts, puis l'adresse générale de l'entreprise, sans doublon. Sans
 * contact principal, c'est l'adresse de l'entreprise qui est cochée. L'e-mail
 * ne part jamais ailleurs : le serveur refuse toute autre adresse.
 */
export function followUpRecipients(
    company: { name: string; email: string | null },
    contacts: CompanyContact[],
): FollowUpRecipient[] {
    const seen = new Set<string>();
    const recipients: FollowUpRecipient[] = [];
    const hasPrimary = contacts.some(
        (contact) => contact.is_primary && contact.email,
    );

    for (const contact of [...contacts].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary),
    )) {
        const key = contact.email?.toLocaleLowerCase();

        if (!contact.email || !key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        recipients.push({
            email: contact.email,
            name: contact.name,
            hint: contact.position
                ? `${contact.position}${contact.is_primary ? ' · principal' : ''}`
                : contact.is_primary
                  ? 'Contact principal'
                  : 'Contact',
            preselected: contact.is_primary,
        });
    }

    if (company.email && !seen.has(company.email.toLocaleLowerCase())) {
        recipients.push({
            email: company.email,
            name: company.name,
            hint: 'Adresse de l’entreprise',
            preselected: !hasPrimary,
        });
    }

    return recipients;
}

/**
 * E-mail de suivi libre à une entreprise (relance, point d'étape) : les
 * destinataires parmi ses adresses, un objet et un message, envoyés dans la
 * charte des e-mails de l'équipe, un e-mail par personne.
 */
export function CompanyFollowUpDialog({
    companyUuid,
    recipients,
    open,
    onOpenChange,
}: {
    companyUuid: string;
    recipients: FollowUpRecipient[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const initialChosen = () =>
        recipients.filter((r) => r.preselected).map((r) => r.email);
    const [chosen, setChosen] = useState<string[]>(initialChosen);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setChosen(initialChosen());
            setSubject('');
            setMessage('');
            setErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const toggle = (email: string, checked: boolean) =>
        setChosen((current) =>
            checked
                ? [...current, email]
                : current.filter((candidate) => candidate !== email),
        );

    const ready =
        chosen.length > 0 &&
        subject.trim().length >= 3 &&
        message.trim().length >= 10;

    const submit = () => {
        setErrors({});
        setProcessing(true);
        router.post(
            companyFollowUp({ company: companyUuid }).url,
            {
                emails: chosen,
                subject: subject.trim(),
                message: message.trim(),
            },
            {
                preserveScroll: true,
                onError: (serverErrors) => setErrors(serverErrors),
                onSuccess: () => onOpenChange(false),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const recipientError = Object.entries(errors).find(([key]) =>
        key.startsWith('emails'),
    )?.[1];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Envoyer un e-mail</DialogTitle>
                    <DialogDescription>
                        Un suivi libre, dans la charte de nos e-mails. Chaque
                        personne cochée reçoit son propre message, à son nom,
                        avec vos coordonnées en réponse.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (ready) {
                            submit();
                        }
                    }}
                >
                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-sm font-medium">
                            Destinataires
                        </legend>
                        {recipients.length === 0 && (
                            <p className="text-muted-foreground text-sm">
                                Aucune adresse enregistrée : ajoutez un e-mail à
                                l’entreprise ou à un contact.
                            </p>
                        )}
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
                        <InputError message={recipientError} />
                    </fieldset>
                    <div className="grid gap-2">
                        <Label htmlFor="follow-up-subject">Objet</Label>
                        <Input
                            id="follow-up-subject"
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            placeholder="Point sur vos arrivées de janvier"
                            maxLength={150}
                            autoComplete="off"
                        />
                        <InputError message={errors.subject} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="follow-up-message">Message</Label>
                        <Textarea
                            id="follow-up-message"
                            rows={7}
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder={
                                'Bonjour,\n\nOù en êtes-vous des arrivées prévues ce trimestre ? Nous pouvons…'
                            }
                            maxLength={5000}
                        />
                        <p className="text-muted-foreground text-xs">
                            Le « Bonjour Prénom Nom, » est ajouté pour chaque
                            destinataire ; une ligne vide sépare les
                            paragraphes. Votre signature suit le message.
                        </p>
                        <InputError message={errors.message} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={processing || !ready}>
                            {processing ? <Spinner /> : <Send />}
                            Envoyer ({chosen.length})
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
