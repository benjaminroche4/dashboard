import { Check, Copy, ExternalLink, KeyRound, Send } from 'lucide-react';
import { useState } from 'react';
import { SendUploadLinkDialog } from '@/components/documents/send-upload-link-dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/toast';

/**
 * Lien public de dépôt d'une liste de documents : adresse à transmettre au
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
    defaultEmail,
    linkSentTo,
    linkSentAt,
}: {
    requestUuid: string;
    url: string;
    accessCode: string;
    uploadsCount: number;
    defaultEmail: string | null;
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
        <div className="grid gap-2">
            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="bg-background flex items-start gap-2 rounded-lg border p-3 text-sm break-all hover:underline"
            >
                <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden />
                {url}
            </a>
            <div className="bg-background flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                    <KeyRound className="size-4 shrink-0" aria-hidden />
                    Code d’appairage
                </span>
                <span
                    aria-label={`Code d’appairage ${accessCode}`}
                    className="font-mono text-base font-semibold tracking-[0.3em]"
                >
                    {accessCode}
                </span>
            </div>
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm tabular-nums">
                    {uploadsCount === 0
                        ? 'Aucun fichier reçu pour le moment.'
                        : `${uploadsCount} fichier${uploadsCount > 1 ? 's' : ''} reçu${uploadsCount > 1 ? 's' : ''}.`}
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copy}>
                        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                        {copied ? 'Copié' : 'Copier le lien'}
                    </Button>
                    <Button size="sm" onClick={() => setSending(true)}>
                        <Send aria-hidden />
                        Envoyer par e-mail
                    </Button>
                </div>
            </div>
            {linkSentTo && (
                <p className="text-muted-foreground text-sm">
                    Envoyé à {linkSentTo}
                    {linkSentAt && ` le ${sentAt.format(new Date(linkSentAt))}`}
                    .
                </p>
            )}
            <SendUploadLinkDialog
                requestUuid={requestUuid}
                defaultEmail={linkSentTo ?? defaultEmail}
                accessCode={accessCode}
                open={sending}
                onOpenChange={setSending}
            />
        </div>
    );
}
