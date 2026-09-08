import { ChevronDown, Map } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Fact } from '@/components/leads/lead-show-body';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type Props = {
    facts: Fact[];
    /** Carte des arrondissements (lecture seule). */
    map: ReactNode;
};

const badgeTones = {
    default: '',
    warn: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

/**
 * Bloc « Projet » de la fiche lead : caractéristiques du projet logement sur
 * deux colonnes (libellé au-dessus de la valeur), puis carte des
 * arrondissements, repliée par défaut pour alléger la fiche.
 */
export function LeadProject({ facts, map }: Props) {
    const [mapOpen, setMapOpen] = useState(false);

    return (
        <>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {facts.map((fact) => (
                    <div key={fact.label} className="grid min-w-0 gap-0.5">
                        <dt className="text-muted-foreground flex items-center gap-1.5">
                            {fact.icon}
                            {fact.label}
                        </dt>
                        <dd className="min-w-0 truncate font-medium">
                            {fact.value}
                            {fact.badge && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        'ml-2 align-middle font-medium tabular-nums',
                                        badgeTones[fact.badgeTone ?? 'default'],
                                    )}
                                >
                                    {fact.badge}
                                </Badge>
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
            <Collapsible
                open={mapOpen}
                onOpenChange={setMapOpen}
                className="grid gap-3"
            >
                <CollapsibleTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                    >
                        <Map aria-hidden />
                        {mapOpen
                            ? 'Masquer la carte'
                            : 'Voir la carte des quartiers'}
                        <ChevronDown
                            aria-hidden
                            className={cn(
                                'transition-transform',
                                mapOpen && 'rotate-180',
                            )}
                        />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>{map}</CollapsibleContent>
            </Collapsible>
        </>
    );
}
