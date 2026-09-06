import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { GoogleDistrictMap } from '@/components/leads/google-district-map';
import { Button } from '@/components/ui/button';
import {
    describeDistricts,
    districtPosition,
    ordinal,
    parisDistricts,
} from '@/lib/paris-districts';
import { cn } from '@/lib/utils';

/**
 * Quartiers visés : avec une clé Google Maps, la vraie carte de Paris avec
 * les contours cliquables et une rangée de numéros pour le clavier ; sans
 * clé, une carte schématique, une pastille par arrondissement. Sélection
 * multiple dans les deux cas.
 */
export function DistrictMap({
    value,
    onChange,
    readOnly = false,
}: {
    value: number[];
    onChange?: (districts: number[]) => void;
    /** Lecture seule (fiche lead) : la carte s'affiche, sans boutons ni clic. */
    readOnly?: boolean;
}) {
    const toggle = (number: number) =>
        onChange?.(
            value.includes(number)
                ? value.filter((district) => district !== number)
                : [...value, number].sort((a, b) => a - b),
        );
    const all = value.length === 20;
    const { features } = usePage().props;
    const [mapFailed, setMapFailed] = useState(false);
    // Sans clé ou si Google Maps ne répond pas : carte schématique.
    const apiKey = mapFailed ? null : (features?.googleMapsKey ?? null);

    return (
        <div className="grid gap-2">
            {!readOnly && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                        className="text-muted-foreground text-sm"
                        data-test="districts-summary"
                    >
                        {describeDistricts(value) ??
                            'Aucun arrondissement sélectionné'}
                    </p>
                    <div className="flex gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={all}
                            onClick={() =>
                                onChange?.(
                                    parisDistricts.map(
                                        (district) => district.number,
                                    ),
                                )
                            }
                        >
                            Tout Paris
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={value.length === 0}
                            onClick={() => onChange?.([])}
                        >
                            Effacer
                        </Button>
                    </div>
                </div>
            )}
            {apiKey && (
                <GoogleDistrictMap
                    apiKey={apiKey}
                    value={value}
                    onToggle={toggle}
                    readOnly={readOnly}
                    onError={() => setMapFailed(true)}
                />
            )}
            {apiKey && readOnly ? (
                // Fiche lead : uniquement les quartiers visés, en pastilles lisibles.
                <ul
                    role="list"
                    aria-label="Arrondissements visés"
                    className="flex flex-wrap gap-1.5"
                    data-test="districts-chosen"
                >
                    {value.length === 0 && (
                        <li className="text-muted-foreground text-sm">
                            Aucun quartier précisé.
                        </li>
                    )}
                    {value.length === 20 ? (
                        <li className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                            Tout Paris
                        </li>
                    ) : (
                        [...value]
                            .sort((a, b) => a - b)
                            .map((number) => (
                                <li
                                    key={number}
                                    className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
                                >
                                    {ordinal(number)}
                                </li>
                            ))
                    )}
                </ul>
            ) : (
                <div
                    role="group"
                    aria-label="Arrondissements visés"
                    className={cn(
                        apiKey
                            ? 'flex flex-wrap gap-1.5'
                            : 'bg-sidebar relative aspect-[19/12] w-full overflow-hidden rounded-lg border bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-[size:14px_14px]',
                    )}
                >
                    {/* La Seine, à grands traits, pour se repérer. */}
                    {!apiKey && (
                        <svg
                            aria-hidden
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            className="pointer-events-none absolute inset-0 size-full text-sky-300/70 dark:text-sky-800/60"
                        >
                            <path
                                d="M 0 44 C 12 52, 22 56, 34 52 S 52 44, 62 50 S 78 66, 92 60 L 100 64"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                    )}
                    {parisDistricts.map((district) => {
                        const selected = value.includes(district.number);
                        const position = districtPosition(district);

                        return (
                            <button
                                key={district.number}
                                type="button"
                                aria-pressed={selected}
                                aria-label={`${ordinal(district.number)} arrondissement`}
                                disabled={readOnly}
                                onClick={() => toggle(district.number)}
                                style={
                                    apiKey
                                        ? undefined
                                        : {
                                              left: `${position.left}%`,
                                              top: `${position.top}%`,
                                          }
                                }
                                className={cn(
                                    'flex items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-[background-color,color,transform,box-shadow] outline-none focus-visible:ring-2',
                                    apiKey
                                        ? 'size-7'
                                        : 'absolute size-8 -translate-1/2 sm:size-9',
                                    !readOnly && !apiKey && 'hover:scale-110',
                                    selected
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-background text-foreground',
                                    !readOnly &&
                                        !selected &&
                                        'hover:border-primary/50',
                                    readOnly &&
                                        !selected &&
                                        'text-muted-foreground opacity-60',
                                )}
                            >
                                {district.number}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
