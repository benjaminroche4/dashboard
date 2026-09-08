import { SlidersHorizontal, X } from 'lucide-react';
import { ownerStatusTones } from '@/components/owners/owner-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { OwnerStatus, OwnerStatusOption } from '@/types';

/** Pastille de la couleur du statut (reprend la teinte de son badge). */
const dots: Record<OwnerStatus, string> = {
    to_contact: 'bg-amber-500',
    contacted: 'bg-sky-500',
    interested: 'bg-violet-500',
    mandate: 'bg-green-500',
    declined: 'bg-neutral-400',
};

function Count({ value }: { value: number }) {
    return (
        <span className="text-muted-foreground ml-auto pl-4 text-xs tabular-nums">
            {value}
        </span>
    );
}

/**
 * Filtre par statut des propriétaires, même comportement que le filtre par
 * type des partenaires : un bouton « Filtres » avec le nombre de filtres actifs,
 * un menu à cases à cocher (plusieurs statuts à la fois, chacun avec sa pastille
 * et son compteur) et « Réinitialiser » dès qu'un statut est coché.
 */
export function OwnerStatusFilter({
    statuses,
    counts,
    value,
    onChange,
}: {
    statuses: OwnerStatusOption[];
    counts: Partial<Record<OwnerStatus, number>>;
    /** Statuts cochés ; vide = tous les propriétaires. */
    value: OwnerStatus[];
    onChange: (value: OwnerStatus[]) => void;
}) {
    const activeCount = value.length;
    const toggle = (status: OwnerStatus, checked: boolean) =>
        onChange(
            checked
                ? [...value, status]
                : value.filter((current) => current !== status),
        );

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant={activeCount > 0 ? 'secondary' : 'outline'}
                        size="sm"
                    >
                        <SlidersHorizontal />
                        Filtres
                        {activeCount > 0 && (
                            <Badge
                                variant="default"
                                className="size-5 rounded-full px-0"
                            >
                                {activeCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-56"
                    aria-label="Filtrer par statut"
                >
                    <DropdownMenuLabel>
                        Statut du propriétaire
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statuses.map((status) => (
                        <DropdownMenuCheckboxItem
                            key={status.value}
                            checked={value.includes(status.value)}
                            onCheckedChange={(checked) =>
                                toggle(status.value, checked === true)
                            }
                            // Le menu reste ouvert pour cocher plusieurs statuts.
                            onSelect={(event) => event.preventDefault()}
                        >
                            <span
                                className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    dots[status.value],
                                )}
                                aria-hidden
                            />
                            {status.label}
                            <Count value={counts[status.value] ?? 0} />
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {activeCount > 0 && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange([])}
                >
                    <X />
                    Réinitialiser
                </Button>
            )}
        </div>
    );
}

/** Teintes exportées pour d'éventuels réemplois (badge et pastille restent accordés). */
export { ownerStatusTones };
