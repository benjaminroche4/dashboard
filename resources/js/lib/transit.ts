import type { TransitKind, TransitStop } from '@/types';

/** Libellés des natures d'arrêt, miroir de `App\Enums\TransitKind`. */
export const transitKindLabels: Record<TransitKind, string> = {
    metro: 'Métro',
    rer: 'RER',
    tram: 'Tram',
    bus: 'Bus',
};

/** « Métro Oberkampf · 2, 9 · 4 min à pied », miroir de `TransitStopData::label()`. */
export function transitLabel(stop: TransitStop): string {
    return [
        `${transitKindLabels[stop.kind]} ${stop.name}`.trim(),
        stop.lines.length === 0 ? null : stop.lines.join(', '),
        stop.minutes === null ? null : `${stop.minutes} min à pied`,
    ]
        .filter((part): part is string => part !== null)
        .join(' · ');
}
