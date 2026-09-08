import { Link } from '@inertiajs/react';
import {
    Building2,
    CalendarCheck,
    ExternalLink,
    Home,
    Images,
} from 'lucide-react';
import { PropertyRowActions } from '@/components/properties/property-row-actions';
import { formatAddress } from '@/components/real-estate/columns';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { show as agentShow } from '@/routes/agents';
import { show as propertyShow } from '@/routes/properties';
import type { Property } from '@/types';

/** Étage en toutes lettres : « RDC », « 3e étage ». */
function floorLabel(floor: number | null): string | null {
    if (floor === null) return null;
    if (floor === 0) return 'RDC';

    return `${floor}${floor === 1 ? 'er' : 'e'} étage`;
}

/**
 * Carte d'un bien, dans le style des panneaux de l'application : vignette
 * carrée (photo ou silhouette), titre vers la fiche et adresse, loyer en
 * chiffres tabulaires, type et meublé en badges, surface, pièces et étage en
 * ligne discrète, puis agent et nombre de visites dans un pied séparé.
 */
export function PropertyCard({ property }: { property: Property }) {
    const cover = property.photos[0] ?? null;
    const address = formatAddress(property);
    const details = [
        property.surface_m2 ? `${property.surface_m2} m²` : null,
        property.rooms ? `${property.rooms} pièce(s)` : null,
        floorLabel(property.floor),
    ]
        .filter(Boolean)
        .join(' · ');
    const rent =
        property.rent_cents === null
            ? null
            : formatMoney(property.rent_cents, property.currency);

    return (
        <article
            aria-label={property.label}
            data-testid="property-card"
            className="bg-sidebar flex h-full flex-col gap-4 rounded-xl border p-4"
        >
            <div className="flex items-start gap-3">
                <span className="bg-background relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                    {cover ? (
                        <img
                            src={cover}
                            alt={`Photo de ${property.label}`}
                            loading="lazy"
                            className="size-full object-cover"
                        />
                    ) : (
                        <span
                            role="img"
                            aria-label="Aucune photo"
                            className="text-muted-foreground flex"
                        >
                            <Home className="size-5" aria-hidden />
                        </span>
                    )}
                    {property.photos.length > 1 && (
                        <span
                            className="bg-background/90 text-foreground absolute right-0.5 bottom-0.5 flex items-center gap-0.5 rounded-sm px-1 text-[0.625rem] font-medium tabular-nums"
                            aria-label={`${property.photos.length} photos`}
                        >
                            <Images className="size-2.5" aria-hidden />
                            {property.photos.length}
                        </span>
                    )}
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="flex min-w-0 items-center gap-2">
                        <Link
                            href={propertyShow({ property: property.uuid })}
                            className="truncate text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {property.label}
                        </Link>
                        {property.district !== null && (
                            <Badge
                                variant="secondary"
                                className="shrink-0 font-medium tabular-nums"
                            >
                                {property.district}
                                {property.district === 1 ? 'er' : 'e'}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                        {address ?? 'Adresse non renseignée'}
                    </p>
                </div>
                <div className="-mt-1 -mr-2 shrink-0">
                    <PropertyRowActions property={property} />
                </div>
            </div>

            <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2">
                    {rent ? (
                        <p className="text-sm">
                            <span className="text-base font-semibold tabular-nums">
                                {rent}
                            </span>
                            <span className="text-muted-foreground text-xs">
                                {' '}
                                / mois
                                {property.charges_cents !== null &&
                                    property.charges_cents > 0 &&
                                    ` + ${formatMoney(property.charges_cents, property.currency)} de charges`}
                            </span>
                        </p>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            Loyer non renseigné
                        </p>
                    )}
                    {property.listing_url && (
                        <a
                            href={property.listing_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Ouvrir l’annonce"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <ExternalLink className="size-4" aria-hidden />
                        </a>
                    )}
                </div>
                {(property.property_type_label ||
                    property.furnished_label ||
                    details) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {property.property_type_label && (
                            <Badge variant="secondary" className="font-medium">
                                {property.property_type_label}
                            </Badge>
                        )}
                        {property.furnished_label && (
                            <Badge variant="secondary" className="font-medium">
                                {property.furnished_label}
                            </Badge>
                        )}
                        {details && (
                            <span className="text-muted-foreground text-xs">
                                {details}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs">
                {property.agent ? (
                    <Link
                        href={agentShow({ agent: property.agent.uuid })}
                        className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1.5 underline-offset-4 hover:underline"
                    >
                        <Building2 className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">
                            {property.agent.name}
                            {property.agent.agency &&
                                ` · ${property.agent.agency}`}
                        </span>
                    </Link>
                ) : (
                    <span className="text-muted-foreground">Sans agent</span>
                )}
                <Badge
                    variant="secondary"
                    className="shrink-0 font-medium tabular-nums"
                    aria-label={`${property.visits_count} visite${property.visits_count > 1 ? 's' : ''}`}
                >
                    <CalendarCheck className="size-3" aria-hidden />
                    {property.visits_count}
                </Badge>
            </div>
        </article>
    );
}
