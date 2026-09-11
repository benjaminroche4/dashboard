import { Check, Copy, ExternalLink, KeyRound, Send } from 'lucide-react';
import { useState } from 'react';
import { SendUploadLinkDialog } from '@/components/documents/send-upload-link-dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/toast';

/**
 * Lien de dépôt d'une liste de pièces : adresse à transmettre au
 * client, bouton de copie, nombre de fichiers déjà reçus.
 */
const sentAt = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

export function PublicUploadLink({
    requestUuid,
    url,
    accessCode,
    uploadsCount,
    leadEmails,
    linkSentTo,
    linkSentAt,
}: {
    requestUuid: string;
    url: string;
    accessCode: string;
    uploadsCount: number;
    leadEmails: string[];
    linkSentTo: string | null;
    linkSentAt: string | null;
}) {
    const [copied, setCopied] = useState(false);
    const [sending, setSending] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            notify.success('Lien copié.');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            notify.error('Impossible de copier le lien.');
        }
    };

    return (
        <div className="grid gap-3">
            {/* Le panneau vit dans une colonne étroite : tout s'empile, rien
                n'est mis en concurrence sur une même ligne. */}
            <div className="bg-background grid gap-2 rounded-lg border p-3">
                <div className="grid gap-1">
                    <p className="text-muted-foreground text-xs">
                        Adresse de dépôt
                    </p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm leading-5 break-all underline-offset-4 hover:underline"
                    >
                        {url}
                        <ExternalLink
                            className="ml-1 inline size-3.5 align-[-2px]"
                            aria-hidden
                        />
                    </a>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <KeyRound className="size-3.5 shrink-0" aria-hidden />
                        Code d’appairage
                    </span>
                    <span
                        aria-label={`Code d’appairage ${accessCode}`}
                        className="font-mono text-base font-semibold tracking-[0.2em] tabular-nums"
                    >
                        {accessCode}
                    </span>
                </div>
            </div>

            <div className="grid gap-2">
                <Button size="sm" onClick={() => setSending(true)}>
                    <Send aria-hidden />
                    Envoyer par e-mail
                </Button>
                <Button variant="outline" size="sm" onClick={copy}>
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                    {copied ? 'Copié' : 'Copier le lien'}
                </Button>
            </div>

            <div className="text-muted-foreground grid gap-1 text-xs">
                <p className="tabular-nums">
                    {uploadsCount === 0
                        ? 'Aucun fichier reçu pour le moment.'
                        : `${uploadsCount} fichier${uploadsCount > 1 ? 's' : ''} reçu${uploadsCount > 1 ? 's' : ''}.`}
                </p>
                {linkSentTo && (
                    <p className="break-all">
                        Envoyé à {linkSentTo}
                        {linkSentAt &&
                            ` le ${sentAt.format(new Date(linkSentAt))}`}
                        .
                    </p>
                )}
            </div>

            <SendUploadLinkDialog
                requestUuid={requestUuid}
                leadEmails={leadEmails}
                lastSentTo={linkSentTo}
                accessCode={accessCode}
                open={sending}
                onOpenChange={setSending}
            />
        </div>
    );
}
