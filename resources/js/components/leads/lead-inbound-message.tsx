import {
    ChevronDown,
    Globe,
    MessageSquareText,
    PhoneIncoming,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStoredState } from '@/hooks/use-stored-state';
import { cn } from '@/lib/utils';
import type { LeadDetail, LeadInboundMessage as Inbound } from '@/types';
import { parisFormat } from '@/lib/datetime';

const kinds = {
    website: { icon: Globe, title: 'Message reçu depuis le site' },
    call: { icon: PhoneIncoming, title: 'Résumé de l’appel entrant' },
    sms: { icon: MessageSquareText, title: 'SMS reçu' },
} as const;

const dateTime = parisFormat({
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Ce que le lead nous a dit en arrivant, **déplié par défaut** quel que soit
 * le statut du lead ; replié ou déplié, l'état est mémorisé par lead dans
 * `localStorage` (`lead.<uuid>.inbound`) et survit au rechargement
 * (28 octobre 2026). Aucun bouton d'action : l'attribution se fait dans le
 * bloc « Suivi par » et les coordonnées se lisent à côté.
 */
export function LeadInboundMessage({
    lead,
    inbound,
    title: heading,
    defaultOpen,
    storageKey,
    className,
}: {
    lead: LeadDetail;
    inbound: Inbound;
    /** Intitulé imposé (« Dernier appel entrant » pour un échange postérieur à l'arrivée). */
    title?: string;
    /** État initial quand rien n'est mémorisé ; dépliée par défaut. */
    defaultOpen?: boolean;
    /** Suffixe de la clé mémorisée (`inbound` par défaut, `last-call` pour la carte du dernier appel). */
    storageKey?: string;
    className?: string;
}) {
    const [open, setOpen] = useStoredState(
        `lead.${lead.uuid}.${storageKey ?? 'inbound'}`,
        defaultOpen ?? true,
    );
    const { icon: Icon, title: kindTitle } = kinds[inbound.kind];
    const title = heading ?? kindTitle;
    const when = inbound.at ? dateTime.format(new Date(inbound.at)) : null;
    // Un message du site ne porte plus sa ligne de provenance (formulaire,
    // référence, date) : son type de demande s'écrit en tête du message,
    // le reste se lit dans le fil d'activité (28 octobre 2026).
    const provenance = inbound.kind !== 'website';

    return (
        <section
            aria-label={title}
            data-testid="lead-inbound"
            data-state={open ? 'open' : 'collapsed'}
            className={cn(
                'bg-sidebar grid gap-3 rounded-xl border p-3',
                className,
            )}
        >
            {/* Même coquille que les autres sections d'une fiche ; l'intitulé
                garde sa ligne de provenance et son bouton de repli. */}
            <header className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
                <div className="grid min-w-0 gap-0.5">
                    <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
                        {title}
                    </h2>
                    {provenance && (
                        <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                            <Icon className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">
                                {inbound.meta}
                                {when ? ` · ${when}` : ''}
                            </span>
                        </p>
                    )}
                </div>
                {
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-expanded={open}
                        onClick={() => setOpen(!open)}
                    >
                        {open ? 'Replier' : 'Afficher'}
                        <ChevronDown
                            className={cn(
                                'transition-transform',
                                open && 'rotate-180',
                            )}
                            aria-hidden
                        />
                    </Button>
                }
            </header>
            {open && (
                <div className="bg-background grid gap-3 rounded-lg border p-4">
                    {/* Le sujet sur sa ligne, puis le message, séparés d'un peu
                        d'air : deux choses, pas une phrase. */}
                    <blockquote className="grid gap-2 text-sm">
                        {inbound.topic && (
                            <p data-testid="lead-inbound-topic">
                                <span className="font-semibold">Topic :</span>{' '}
                                {inbound.topic}
                            </p>
                        )}
                        <p className="whitespace-pre-line">{inbound.body}</p>
                    </blockquote>
                </div>
            )}
        </section>
    );
}
