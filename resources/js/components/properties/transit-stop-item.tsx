import { Badge } from '@/components/ui/badge';
import { transitKindLabels } from '@/lib/transit';
import type { TransitStop } from '@/types';

/**
 * Un arrêt : nature et nom, puis chaque ligne desservie en badge
 * (« Métro Oberkampf · [2] [9] · 4 min à pied »).
 */
export function TransitStopItem({ stop }: { stop: TransitStop }) {
    return (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="font-medium">
                {transitKindLabels[stop.kind]} {stop.name}
            </span>
            {stop.lines.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                    {stop.lines.map((line) => (
                        <Badge
                            key={line}
                            variant="secondary"
                            className="min-w-6 justify-center px-1.5 py-0 font-mono text-[11px] tabular-nums"
                        >
                            {line}
                        </Badge>
                    ))}
                </span>
            )}
            {stop.minutes !== null && (
                <span className="text-muted-foreground text-xs tabular-nums">
                    {stop.minutes} min à pied
                </span>
            )}
        </div>
    );
}
