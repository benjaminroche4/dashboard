import { Link } from '@inertiajs/react';
import {
    BedDouble,
    CalendarCheck,
    CalendarCheck2,
    ChevronLeft,
    ChevronRight,
    DoorOpen,
    ExternalLink,
    Home,
    MapPin,
    Ruler,
    type LucideIcon,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { PropertyRowActions } from '@/components/properties/property-row-actions';
import { PropertyStatusBadge } from '@/components/properties/property-status-badge';
import { formatAddress } from '@/components/real-estate/columns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useInitials } from '@/hooks/use-initials';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as agentShow } from '@/routes/agents';
import { show as propertyShow } from '@/routes/properties';
import type { Property } from '@/types';

/** Nombre de photos montrées dans le carrousel de la carte. */
export const CARD_PHOTOS = 3;

/**
 * Carrousel des premières photos du bien : défilement horizontal aimanté (au
 * doigt ou à la molette) et pastilles cliquables sous la photo. Sans photo,
 * une silhouette de maison occupe le cadre.
 */
function PropertyPhotos({ property }: { property: Property }) {
    const photos = property.photos.slice(0, CARD_PHOTOS);
    const [active, setActive] = useState(0);
    const track = useRef<HTMLDivElement>(null);

    if (photos.length === 0) {
        return (
            <span
                role="img"
                aria-label="Aucune photo"
                className="text-muted-foreground flex size-full items-center justify-center"
            >
                <Home className="size-8" aria-hidden />
            </span>
        );
    }

    const goTo = (index: number) => {
        setActive(index);
        const element = track.current;
        if (!element) return;

        const left = element.clientWidth * index;
        if (element.scrollTo) {
            element.scrollTo({ left, behavior: 'smooth' });
        } else {
            element.scrollLeft = left;
        }
    };

    return (
        <>
            <div
                ref={track}
                onScroll={(event) => {
                    const element = event.currentTarget;
                    if (element.clientWidth === 0) return;

                    setActive(
                        Math.round(element.scrollLeft / element.clientWidth),
                    );
                }}
                className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
            >
                {photos.map((photo, index) => (
                    <img
                        key={photo}
                        src={photo}
                        alt={`Photo ${index + 1} de ${property.label}`}
                        loading="lazy"
                        className="size-full shrink-0 snap-center object-cover"
                    />
                ))}
            </div>
            {photos.length > 1 && (
                <>
                    {/* Flèches discrètes, révélées au survol comme sur la marketplace. */}
                    {[
                        {
                            label: 'Photo précédente',
                            icon: ChevronLeft,
                            side: 'left-2',
                            step: -1,
                        },
                        {
                            label: 'Photo suivante',
                            icon: ChevronRight,
                            side: 'right-2',
                            step: 1,
                        },
                    ].map(({ label, icon: Icon, side, step }) => (
                        <button
                            key={label}
                            type="button"
                            aria-label={label}
                            onClick={() =>
                                goTo(
                                    (active + step + photos.length) %
                                        photos.length,
                                )
                            }
                            className={cn(
                                'bg-background/80 text-foreground absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition duration-200',
                                'scale-95 opacity-0 group-hover/photo:scale-100 group-hover/photo:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 max-md:scale-100 max-md:opacity-100',
                                side,
                            )}
                        >
                            <Icon className="size-4" aria-hidden />
                        </button>
                    ))}
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-neutral-900/40 px-1.5 py-1 transition group-hover/photo:bg-neutral-900/70">
                        {photos.map((photo, index) => (
                            <button
                                key={photo}
                                type="button"
                                onClick={() => goTo(index)}
                                aria-label={`Photo ${index + 1}`}
                                aria-current={index === active}
                                className={cn(
                                    'size-1.5 rounded-full transition-colors duration-200',
                                    index === active
                                        ? 'bg-white'
                                        : 'bg-white/50 hover:bg-white/80',
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

/** Un pavé du bandeau de caractéristiques : icône au-dessus de sa valeur. */
function Feature({
    icon: Icon,
    children,
}: {
    icon: LucideIcon;
    children: ReactNode;
}) {
    return (
        <li className="bg-muted grid min-w-0 flex-1 justify-items-center gap-1 px-1 py-2 first:rounded-l-md last:rounded-r-md">
            <Icon className="text-muted-foreground size-3" aria-hidden />
            <span className="max-w-full truncate text-xs">{children}</span>
        </li>
    );
}

/**
 * Carte d'un bien reprenant la carte d'annonce de la marketplace Relocation In
 * Paris : photo 4/3 arrondie avec son carrousel et ses pastilles, puis le loyer
 * en gros, le titre, l'adresse avec sa punaise et un bandeau gris de trois
 * caractéristiques. Le pied (agent, visites, annonce) et le bouton vers la fiche
 * sont propres au backoffice.
 */
export function PropertyCard({
    property,
    selected = false,
    onSelectedChange,
}: {
    property: Property;
    /** Sélection multiple de l'annuaire ; absente, la case n'apparaît pas. */
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
}) {
    const address = formatAddress(property);
    const rent =
        property.rent_cents === null
            ? null
            : formatMoney(property.rent_cents, property.currency);
    const charges =
        property.charges_cents !== null && property.charges_cents > 0
            ? formatMoney(property.charges_cents, property.currency)
            : null;
    const initials = useInitials();

    return (
        <article
            aria-label={property.label}
            data-testid="property-card"
            data-selected={selected || undefined}
            className="bg-card data-[selected]:ring-primary flex h-full flex-col gap-1 overflow-hidden rounded-2xl border p-2 data-[selected]:ring-2"
        >
            <div className="bg-muted group/photo relative h-[180px] shrink-0 overflow-hidden rounded-lg">
                <PropertyPhotos property={property} />
                <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        {onSelectedChange && (
                            <span className="bg-background/90 pointer-events-auto flex size-6 items-center justify-center rounded-md backdrop-blur-sm">
                                <Checkbox
                                    checked={selected}
                                    onCheckedChange={(value) =>
                                        onSelectedChange(value === true)
                                    }
                                    aria-label={`Sélectionner ${property.label}`}
                                />
                            </span>
                        )}
                        <PropertyStatusBadge
                            status={property.status}
                            label={property.status_label}
                            className="rounded-full backdrop-blur-sm"
                        />
                    </div>
                    <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5">
                        <span className="bg-background/90 rounded-full backdrop-blur-sm">
                            <PropertyRowActions property={property} />
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-2 py-2">
                {(property.lease_type_label || property.agent) && (
                    <div className="flex items-center justify-between gap-2">
                        {property.lease_type_label ? (
                            <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs dark:border-amber-900 dark:bg-amber-950/40">
                                <CalendarCheck2
                                    className="size-3 shrink-0"
                                    aria-hidden
                                />
                                <span className="truncate">
                                    {property.lease_type_label}
                                </span>
                            </span>
                        ) : (
                            <span />
                        )}
                        {property.agent && (
                            <Link
                                href={agentShow({ agent: property.agent.uuid })}
                                aria-label={`Agent : ${property.agent.name}`}
                                className="shrink-0"
                            >
                                <Avatar className="size-6">
                                    <AvatarFallback className="text-[10px]">
                                        {initials(property.agent.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    {/* Le loyer d'abord et en gros, comme sur les annonces de la marketplace. */}
                    {rent ? (
                        <p className="flex flex-wrap items-baseline gap-x-1.5">
                            <span className="text-primary text-2xl font-semibold tabular-nums">
                                {rent}
                            </span>
                            <span className="text-muted-foreground text-sm">
                                /mois
                            </span>
                            {property.charges_included && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                                    charges comprises
                                </span>
                            )}
                            {charges && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                                    {property.charges_included
                                        ? `dont ${charges} de charges`
                                        : `+ ${charges} de charges`}
                                </span>
                            )}
                        </p>
                    ) : (
                        <p className="text-muted-foreground text-lg font-semibold">
                            Loyer non renseigné
                        </p>
                    )}

                    <Link
                        href={propertyShow({ property: property.uuid })}
                        className="truncate text-base font-semibold underline-offset-4 hover:underline"
                    >
                        {property.label}
                    </Link>

                    <p className="text-muted-foreground flex items-start gap-x-1 text-sm">
                        <MapPin
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden
                        />
                        <span className="line-clamp-2">
                            {address ?? 'Adresse non renseignée'}
                        </span>
                    </p>
                </div>

                {/* Bandeau segmenté de la maquette : trois pavés, icône au-dessus. */}
                <ul role="list" className="flex gap-0.5">
                    <Feature icon={BedDouble}>
                        {property.furnished_label ?? 'Meublé inconnu'}
                    </Feature>
                    <Feature icon={DoorOpen}>
                        {property.rooms
                            ? `${property.rooms} pièce${property.rooms > 1 ? 's' : ''}`
                            : 'Pièces —'}
                    </Feature>
                    <Feature icon={Ruler}>
                        {property.surface_m2
                            ? `${property.surface_m2} m²`
                            : 'Surface —'}
                    </Feature>
                </ul>

                <div className="text-muted-foreground mt-auto flex items-center gap-1.5 text-xs">
                    <span
                        className="flex shrink-0 items-center gap-1 font-medium tabular-nums"
                        aria-label={`${property.visits_count} visite${property.visits_count > 1 ? 's' : ''}`}
                    >
                        <CalendarCheck className="size-3" aria-hidden />
                        {property.visits_count}
                    </span>
                    {property.listing_url && (
                        <a
                            href={property.listing_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Ouvrir l’annonce"
                            className="hover:text-foreground ml-auto flex shrink-0 items-center gap-1 underline-offset-4 hover:underline"
                        >
                            Annonce
                            <ExternalLink className="size-3" aria-hidden />
                        </a>
                    )}
                </div>

                <Button asChild className="w-full">
                    <Link href={propertyShow({ property: property.uuid })}>
                        Voir le bien
                    </Link>
                </Button>
            </div>
        </article>
    );
}
