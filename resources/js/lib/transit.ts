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

/**
 * Couleurs officielles du réseau francilien (Île-de-France Mobilités) : c'est
 * à elles qu'un Parisien reconnaît une ligne, bien avant d'en lire le numéro.
 * Le texte passe au noir sur les fonds clairs, où le blanc ne se lirait pas.
 */
const metroColors: Record<string, string> = {
    '1': '#FFCE00',
    '2': '#0064B0',
    '3': '#9F9825',
    '3bis': '#98D4E2',
    '4': '#C04191',
    '5': '#F28E42',
    '6': '#83C491',
    '7': '#F3A4BA',
    '7bis': '#83C491',
    '8': '#CEADD2',
    '9': '#D5C900',
    '10': '#E3B32A',
    '11': '#8D5E2A',
    '12': '#00814F',
    '13': '#98D4E2',
    '14': '#662483',
};

const rerColors: Record<string, string> = {
    A: '#E2231A',
    B: '#5291CE',
    C: '#FFCE00',
    D: '#00814F',
    E: '#C04191',
};

const tramColors: Record<string, string> = {
    '1': '#0064B0',
    '2': '#C04191',
    '3a': '#E2231A',
    '3b': '#F28E42',
    '4': '#E3B32A',
    '5': '#662483',
    '6': '#9F9825',
    '7': '#8D5E2A',
    '8': '#9F9825',
    '9': '#00814F',
    '10': '#83C491',
    '11': '#F3A4BA',
    '12': '#00814F',
    '13': '#8D5E2A',
};

/**
 * Les bus franciliens n'ont pas de couleur par ligne : tout le réseau porte
 * la même livrée. On ne lui en invente pas une.
 */
const busColor = '#5A5A5A';

/** Noir sur un fond clair, blanc sinon — lu depuis la clarté perçue. */
function readableOn(background: string): string {
    const channel = (from: number) =>
        parseInt(background.slice(from, from + 2), 16);
    const luminance =
        (0.299 * channel(1) + 0.587 * channel(3) + 0.114 * channel(5)) / 255;

    return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

/** Fond et texte du badge d'une ligne, prêts à poser en variables CSS. */
export function transitLineColors(
    kind: TransitKind,
    line: string,
): { background: string; text: string } {
    const key = line.trim().toLowerCase();
    const background =
        kind === 'metro'
            ? (metroColors[key] ?? busColor)
            : kind === 'rer'
              ? (rerColors[key.toUpperCase()] ?? busColor)
              : kind === 'tram'
                ? (tramColors[key] ?? busColor)
                : busColor;

    return { background, text: readableOn(background) };
}
