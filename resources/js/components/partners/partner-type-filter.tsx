import { SlidersHorizontal, X } from 'lucide-react';
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
import { partnerTypeIcons } from '@/lib/partner-type-icons';
import type { PartnerType, PartnerTypeOption } from '@/types';

function Count({ value }: { value: number }) {
    return (
        <span className="text-muted-foreground ml-auto pl-4 text-xs tabular-nums">
            {value}
        </span>
    );
}

/**
 * Filtre par type des partenaires, dans le style de la barre de filtres des leads :
 * un bouton « Filtres » avec le nombre de filtres actifs en badge, un menu à cases
 * à cocher (plusieurs types à la fois, chacun avec son icône et son compteur),
 * et un bouton « Réinitialiser » dès qu'un filtre est actif.
 */
export function PartnerTypeFilter({
    types,
    counts,
    value,
    onChange,
}: {
    types: PartnerTypeOption[];
    counts: Partial<Record<PartnerType, number>>;
    /** Types cochés ; vide = tous les partenaires. */
    value: PartnerType[];
    onChange: (value: PartnerType[]) => void;
}) {
    const activeCount = value.length;
    const toggle = (type: PartnerType, checked: boolean) =>
        onChange(
            checked
                ? [...value, type]
                : value.filter((current) => current !== type),
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
                <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Type de partenaire</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {types.map((type) => {
                        const Icon = partnerTypeIcons[type.value];

                        return (
                            <DropdownMenuCheckboxItem
                                key={type.value}
                                checked={value.includes(type.value)}
                                onCheckedChange={(checked) =>
                                    toggle(type.value, checked === true)
                                }
                                // Le menu reste ouvert pour cocher plusieurs types.
                                onSelect={(event) => event.preventDefault()}
                            >
                                <Icon
                                    className="text-muted-foreground size-3.5"
                                    aria-hidden
                                />
                                {type.label}
                                <Count value={counts[type.value] ?? 0} />
                            </DropdownMenuCheckboxItem>
                        );
                    })}
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
