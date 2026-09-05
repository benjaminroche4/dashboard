import { Button } from '@/components/ui/button';
import {
    describeDistricts,
    districtPosition,
    ordinal,
    parisDistricts,
} from '@/lib/paris-districts';
import { cn } from '@/lib/utils';

/**
 * Carte schématique de Paris : un pastille cliquable par arrondissement,
 * placée d'après ses coordonnées réelles. Sélection multiple.
 */
export function DistrictMap({
    value,
    onChange,
}: {
    value: number[];
    onChange: (districts: number[]) => void;
}) {
    const toggle = (number: number) =>
        onChange(
            value.includes(number)
                ? value.filter((district) => district !== number)
                : [...value, number].sort((a, b) => a - b),
        );
    const all = value.length === 20;

    return (
        <div className="grid gap-2">
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
                            onChange(
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
                        onClick={() => onChange([])}
                    >
                        Effacer
                    </Button>
                </div>
            </div>
            <div
                role="group"
                aria-label="Arrondissements visés"
                className="bg-sidebar relative aspect-[19/12] w-full overflow-hidden rounded-lg border bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-[size:14px_14px]"
            >
                {/* La Seine, à grands traits, pour se repérer. */}
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
                {parisDistricts.map((district) => {
                    const selected = value.includes(district.number);
                    const position = districtPosition(district);

                    return (
                        <button
                            key={district.number}
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${ordinal(district.number)} arrondissement`}
                            onClick={() => toggle(district.number)}
                            style={{
                                left: `${position.left}%`,
                                top: `${position.top}%`,
                            }}
                            className={cn(
                                'absolute flex size-8 -translate-1/2 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-[background-color,color,transform,box-shadow] outline-none hover:scale-110 focus-visible:ring-2 sm:size-9',
                                selected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-background text-foreground hover:border-primary/50',
                            )}
                        >
                            {district.number}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
