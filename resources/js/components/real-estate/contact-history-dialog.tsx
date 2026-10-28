import { History } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';
import { parisFormat } from '@/lib/datetime';
import type { ContactHistoryEntry } from '@/types';

const dayFormat = parisFormat({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const timeFormat = parisFormat({ hour: '2-digit', minute: '2-digit' });

const notedFormat = parisFormat({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/** Vrai quand l'échange a été daté après coup : la saisie n'est pas le même jour. */
export function notedLater(entry: ContactHistoryEntry): boolean {
    return (
        dayFormat.format(new Date(entry.at)) !==
        dayFormat.format(new Date(entry.noted_at))
    );
}

/**
 * Lien « Voir l'historique » à côté du dernier échange d'une fiche de
 * l'annuaire (agent, agence, partenaire, propriétaire) : il ouvre une modale
 * qui liste tous les échanges notés, du plus récent au plus ancien, avec le
 * membre qui l'a noté. Sans aucun échange, le lien n'a rien à montrer et
 * n'apparaît pas.
 */
export function ContactHistoryDialog({
    contacts,
    name,
}: {
    contacts: ContactHistoryEntry[];
    /** Nom de la personne ou de la société, pour le titre. */
    name: string;
}) {
    const [open, setOpen] = useState(false);
    const initials = useInitials();

    if (contacts.length === 0) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                variant="link"
                size="sm"
                className="text-muted-foreground h-auto px-0 text-xs underline underline-offset-4"
                onClick={() => setOpen(true)}
            >
                <History className="size-3.5" aria-hidden />
                Voir l'historique
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Historique des échanges</DialogTitle>
                        <DialogDescription>
                            {contacts.length === 1
                                ? `Un échange noté avec ${name}.`
                                : `${contacts.length} échanges notés avec ${name}, du plus récent au plus ancien.`}
                        </DialogDescription>
                    </DialogHeader>
                    <ol
                        className="max-h-96 divide-y overflow-y-auto text-sm"
                        aria-label="Échanges notés"
                    >
                        {contacts.map((entry) => {
                            const actor = entry.by?.name ?? 'Le système';
                            const at = new Date(entry.at);

                            return (
                                <li
                                    key={entry.id}
                                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                                >
                                    <Avatar className="mt-0.5 size-8">
                                        {entry.by?.avatar && (
                                            <AvatarImage
                                                src={entry.by.avatar}
                                                alt=""
                                            />
                                        )}
                                        <AvatarFallback className="text-[10px]">
                                            {entry.by ? (
                                                initials(actor)
                                            ) : (
                                                <History
                                                    className="size-3"
                                                    aria-hidden
                                                />
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid min-w-0 flex-1 gap-0.5">
                                        <time
                                            dateTime={entry.at}
                                            className="font-medium"
                                        >
                                            {dayFormat.format(at)}
                                            <span className="text-muted-foreground font-normal tabular-nums">
                                                {' '}
                                                · {timeFormat.format(at)}
                                            </span>
                                        </time>
                                        <p className="text-muted-foreground text-xs">
                                            Noté par {actor}
                                            {notedLater(entry) &&
                                                ` le ${notedFormat.format(new Date(entry.noted_at))}`}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </DialogContent>
            </Dialog>
        </>
    );
}
