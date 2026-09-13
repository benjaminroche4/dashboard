import type { CSSProperties } from 'react';
import { transitKindLabels, transitLineColors } from '@/lib/transit';
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
                    {stop.lines.map((line) => {
                        const colors = transitLineColors(stop.kind, line);

                        return (
                            /* Les couleurs du réseau : c'est à elles qu'on
                               reconnaît une ligne avant d'en lire le numéro. */
                            <span
                                key={line}
                                className="inline-flex min-w-5 items-center justify-center rounded-sm bg-(--line) px-1 text-[11px] font-semibold text-(--line-text) tabular-nums"
                                style={
                                    {
                                        '--line': colors.background,
                                        '--line-text': colors.text,
                                    } as CSSProperties
                                }
                            >
                                {line}
                            </span>
                        );
                    })}
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
