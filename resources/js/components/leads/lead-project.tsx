import type { ReactNode } from 'react';
import type { Fact } from '@/components/leads/lead-show-body';
import { Badge } from '@/components/ui/badge';
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
 * arrondissements.
 */
export function LeadProject({ facts, map }: Props) {
    return (
        <>
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
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
            {map}
        </>
    );
}
