import { router } from '@inertiajs/react';
import { CalendarCheck, Clock, NotebookPen } from 'lucide-react';
import { useState } from 'react';
import { ClampedText } from '@/components/clamped-text';
import { InlineField, type InlineValue } from '@/components/inline-field';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { Section, TimelineDot } from '@/components/leads/lead-show-body';
import { ContactHistoryDialog } from '@/components/real-estate/contact-history-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { parisFormat } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { ContactHistoryEntry } from '@/types';

// « 28 octobre 2026 à 14:44 » : l'heure du dernier échange compte autant
// que le jour (demandé le 28 octobre 2026).
const contactDate = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * « Suivi et notes » des fiches d'annuaire (agent, agence) sur le moule de
 * la frise « Suivi par » d'un lead : le dernier échange sur le rail avec son
 * heure et le portrait de qui l'a noté (nom au survol), « Voir l'historique »
 * en face, « Échange noté » en action, puis les notes, modifiables en place.
 */
export function DirectoryFollowUp({
    name,
    lastContactedAt,
    touchUrl,
    contacts = [],
    notes,
    saving = false,
    error,
    onSaveNotes,
    className,
}: {
    name: string;
    lastContactedAt: string | null;
    /** Route qui note l'échange du jour (`agents.touch`, `agencies.touch`). */
    touchUrl: string;
    /** Tous les échanges notés, du plus récent au plus ancien. */
    contacts?: ContactHistoryEntry[];
    notes: string | null;
    saving?: boolean;
    error?: string | null;
    onSaveNotes: (value: InlineValue) => void;
    className?: string;
}) {
    const [touching, setTouching] = useState(false);
    // L'historique arrive du plus récent au plus ancien : son premier auteur
    // est celui du dernier échange.
    const lastNoter = lastContactedAt ? (contacts[0]?.by ?? null) : null;
    const touch = () => {
        setTouching(true);
        router.post(
            touchUrl,
            {},
            { preserveScroll: true, onFinish: () => setTouching(false) },
        );
    };

    return (
        <Section
            title="Suivi et notes"
            icon={NotebookPen}
            className={className}
            action={
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={touching}
                    onClick={touch}
                >
                    <CalendarCheck aria-hidden />
                    Échange noté
                </Button>
            }
        >
            {/* Le rail s'aligne sur l'axe de la pastille du titre
                (28 px, donc 14 px) : les points, qui débordent de 9 px à
                gauche du rail, restent dans la colonne (28 octobre 2026). */}
            <ol
                className="relative ml-3.5 grid gap-4 border-l pl-5 text-sm"
                data-testid="follow-up-rail"
            >
                <li className="relative">
                    <TimelineDot
                        tone="past"
                        step={0}
                        replayKey={lastContactedAt ?? ''}
                    />
                    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                        <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5" aria-hidden />
                            Dernier échange
                        </span>
                        <ContactHistoryDialog contacts={contacts} name={name} />
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                        {lastContactedAt
                            ? contactDate.format(new Date(lastContactedAt))
                            : 'Aucun échange noté pour le moment.'}
                        {lastNoter && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar
                                            className="size-5"
                                            aria-label={`Noté par ${lastNoter.name}`}
                                        >
                                            {lastNoter.avatar && (
                                                <AvatarImage
                                                    src={lastNoter.avatar}
                                                    alt=""
                                                />
                                            )}
                                            <AvatarFallback
                                                className={cn(
                                                    'text-[9px]',
                                                    memberTone(lastNoter.id),
                                                )}
                                            >
                                                {initials(lastNoter.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {lastNoter.name}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </li>
                <li className="relative">
                    <TimelineDot tone="next" step={1} />
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <NotebookPen className="size-3.5" aria-hidden />
                        Notes
                    </div>
                    {/* Un peu d'air entre l'intitulé et la note, qu'elle
                        existe ou non (28 octobre 2026). */}
                    <InlineField
                        className="mt-1.5"
                        label="Notes"
                        display={
                            notes ? (
                                <ClampedText
                                    text={notes}
                                    className="text-sm/6"
                                />
                            ) : (
                                <span className="text-muted-foreground">
                                    Aucune note.
                                </span>
                            )
                        }
                        edit={{
                            kind: 'textarea',
                            value: notes,
                            placeholder:
                                'Ce qu’il faut savoir avant d’appeler…',
                        }}
                        saving={saving}
                        error={error}
                        onSave={onSaveNotes}
                    />
                </li>
            </ol>
        </Section>
    );
}
