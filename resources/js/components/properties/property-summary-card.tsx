import { Link2, TrainFront } from 'lucide-react';
import { AiBadge } from '@/components/ai-badge';
import { PropertyAddressMap } from '@/components/properties/property-address-map';
import { PropertyStatusBadge } from '@/components/properties/property-status-badge';
import { Badge } from '@/components/ui/badge';
import { propertyFormSummary } from '@/lib/property-form';
import { cn } from '@/lib/utils';
import type { PropertyForm, PropertyFormOptions } from '@/types';
import { TransitStopItem } from '@/components/properties/transit-stop-item';

/** Une ligne de la fiche : l'intitulé, puis la valeur ou son absence en gris. */
function Row({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 py-2 first:pt-0 last:pb-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    'break-words',
                    value === null && 'text-muted-foreground/70',
                )}
            >
                {value ?? 'Non renseigné'}
            </dd>
        </div>
    );
}

/**
 * Carte récapitulative du formulaire d'un bien : ce qu'on est en train de
 * saisir, présenté comme le client le lira — loyer en avant, caractéristiques
 * en pastilles. Rien n'y est modifiable.
 */
export function PropertySummaryCard({
    values,
    options,
    searchingTransit = false,
    className,
}: {
    values: PropertyForm;
    options: PropertyFormOptions;
    /** L'assistant cherche les transports de l'adresse qu'on vient de saisir. */
    searchingTransit?: boolean;
    className?: string;
}) {
    const summary = propertyFormSummary(values, options);

    return (
        <aside
            aria-label="Récapitulatif du bien"
            className={cn(
                // Même découpe que les autres cartes du backoffice : titre sur
                // le fond gris du panneau, contenu dans un bloc blanc.
                'bg-sidebar grid h-fit content-start gap-3 rounded-xl border p-4',
                className,
            )}
        >
            <header className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-medium">Récapitulatif</h2>
                {summary.statusLabel && (
                    <PropertyStatusBadge
                        status={values.status}
                        label={summary.statusLabel}
                    />
                )}
            </header>
            <div className="bg-background grid content-start gap-4 rounded-lg border p-4">
                <div className="grid gap-2">
                    {/* Le nom à gauche, l'arrondissement à droite : la
                    disponibilité vit dans l'en-tête du panneau. */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="grid min-w-0 gap-1">
                            <h3 className="truncate text-sm font-medium">
                                {summary.name || 'Bien sans nom'}
                            </h3>
                            <p className="text-muted-foreground text-xs">
                                {summary.address ?? 'Adresse à renseigner'}
                            </p>
                        </div>
                        {summary.district && (
                            <Badge variant="outline" className="shrink-0">
                                {summary.district}
                            </Badge>
                        )}
                    </div>
                    {/* L'adresse saisie, située : on voit tout de suite le quartier. */}
                    <PropertyAddressMap address={summary.address} />
                </div>

                {/* Le loyer est le chiffre qu'on regarde en premier. */}
                <div className="grid gap-0.5">
                    <p
                        className={cn(
                            'text-lg font-medium tabular-nums',
                            summary.rent === null &&
                                'text-muted-foreground/70 text-sm font-normal',
                        )}
                    >
                        {summary.rent ?? 'Loyer non renseigné'}
                    </p>
                    {summary.charges && (
                        <p className="text-muted-foreground text-xs">
                            {summary.charges}
                        </p>
                    )}
                </div>

                {summary.features.length > 0 && (
                    <ul role="list" className="flex flex-wrap gap-1">
                        {summary.features.map((feature) => (
                            <li key={feature}>
                                <Badge variant="outline">{feature}</Badge>
                            </li>
                        ))}
                    </ul>
                )}

                <dl className="divide-border grid divide-y border-t pt-3 text-xs">
                    <Row label="Propriétaire" value={summary.owner} />
                    <Row label="Agent" value={summary.agent} />
                    <Row label="Bail" value={summary.leaseLabel} />
                </dl>

                {/* Ce que l'assistant a trouvé tout seul depuis l'adresse. */}
                {(searchingTransit || values.transit.length > 0) && (
                    <section
                        aria-label="Transports proches"
                        className="grid gap-2 border-t pt-3"
                    >
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                <TrainFront className="size-3.5" aria-hidden />
                                Transports proches
                            </span>
                            <AiBadge />
                        </div>
                        {values.transit.length === 0 ? (
                            <p
                                role="status"
                                className="text-muted-foreground/70 text-xs"
                            >
                                Recherche des transports autour de l’adresse…
                            </p>
                        ) : (
                            <ul role="list" className="grid gap-1.5">
                                {values.transit.map((stop, index) => (
                                    <li
                                        key={`${stop.kind}-${stop.name}-${index}`}
                                    >
                                        <TransitStopItem stop={stop} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {summary.hasListing && (
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <Link2 className="size-3.5 shrink-0" aria-hidden />
                        Lien de l’annonce ajouté
                    </p>
                )}
            </div>
        </aside>
    );
}
