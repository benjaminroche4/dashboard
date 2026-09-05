import { ArrowUpDown, Check, ChevronDown, Search, Star, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { defaultFilters, type LeadFilters } from '@/lib/kanban';
import { cn } from '@/lib/utils';
import type {
    LeadAssigneeFilter,
    LeadOfferOption,
    LeadSortKey,
    OfferValue,
} from '@/types';

type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

const assigneeOptions: Option<LeadAssigneeFilter>[] = [
    { value: 'all', label: 'Tous les responsables' },
    { value: 'me', label: 'Mes leads' },
    { value: 'none', label: 'Non attribués' },
];

const scoreOptions: Option<string>[] = [
    { value: '0', label: 'Toutes les notes' },
    ...[5, 4, 3, 2].map((score) => ({
        value: String(score),
        label: score === 5 ? '5 étoiles' : `${score} étoiles et plus`,
        icon: (
            <Star
                className="size-3.5 fill-current text-amber-500"
                aria-hidden
            />
        ),
    })),
];

const sortOptions: Option<LeadSortKey>[] = [
    { value: 'manual', label: 'Ordre manuel' },
    { value: 'score', label: 'Meilleure note' },
    { value: 'arrival', label: "Date d'arrivée" },
    { value: 'created', label: 'Plus récents' },
];

/**
 * Pastille de filtre : libellé neutre au repos, valeur choisie et fond teinté
 * quand le filtre est actif. Le menu coche la valeur courante.
 */
function FilterChip<T extends string>({
    label,
    value,
    options,
    active,
    onChange,
    icon,
    align = 'start',
}: {
    label: string;
    value: T;
    options: Option<T>[];
    /** Faux quand la valeur est celle par défaut. */
    active: boolean;
    onChange: (value: T) => void;
    icon?: ReactNode;
    align?: 'start' | 'end';
}) {
    const current = options.find((option) => option.value === value);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={label}
                data-active={active ? '' : undefined}
                className={cn(
                    'inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-sm transition-colors outline-none focus-visible:ring-2',
                    active
                        ? 'border-primary/30 bg-primary/10 text-foreground font-medium'
                        : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
            >
                {icon}
                <span className="truncate">
                    {active ? current?.label : label}
                </span>
                <ChevronDown
                    className="size-3.5 shrink-0 opacity-60"
                    aria-hidden
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={align}
                className="w-52 rounded-lg p-1 shadow-md"
            >
                {options.map((option) => {
                    const selected = option.value === value;

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            aria-current={selected ? 'true' : undefined}
                            onSelect={() => onChange(option.value)}
                            className="gap-2.5 rounded-md px-2 py-1.5"
                        >
                            {option.icon}
                            <span
                                className={cn(
                                    'flex-1 truncate text-sm',
                                    selected && 'font-medium',
                                )}
                            >
                                {option.label}
                            </span>
                            <Check
                                aria-hidden
                                className={cn(
                                    'size-4 shrink-0',
                                    selected ? 'opacity-100' : 'opacity-0',
                                )}
                            />
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Barre de filtres du kanban : recherche, pastilles de filtre et tri.
 */
export function LeadFilterBar({
    filters,
    offers,
    onChange,
}: {
    filters: LeadFilters;
    offers: LeadOfferOption[];
    onChange: (changes: Partial<LeadFilters>) => void;
}) {
    const offerOptions: Option<OfferValue | 'all'>[] = [
        { value: 'all', label: 'Toutes les offres' },
        ...offers.map((offer) => ({ value: offer.value, label: offer.label })),
    ];
    const dirty =
        filters.query !== '' ||
        filters.offer !== defaultFilters.offer ||
        filters.minScore !== defaultFilters.minScore ||
        filters.assignee !== defaultFilters.assignee ||
        filters.sort !== defaultFilters.sort;

    return (
        <div className="flex flex-wrap items-center gap-2 pb-4">
            <label className="relative w-full sm:max-w-xs">
                <span className="sr-only">Filtrer les leads</span>
                <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                    aria-hidden
                />
                <input
                    type="search"
                    name="query"
                    placeholder="Rechercher un lead…"
                    value={filters.query}
                    onChange={(event) =>
                        onChange({ query: event.target.value })
                    }
                    className="bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 h-8 w-full rounded-full border py-1 pr-3 pl-8 text-sm outline-none focus-visible:ring-2 max-sm:text-base"
                />
            </label>
            <FilterChip
                label="Responsable"
                value={filters.assignee}
                options={assigneeOptions}
                active={filters.assignee !== 'all'}
                onChange={(assignee) => onChange({ assignee })}
            />
            <FilterChip
                label="Offre"
                value={filters.offer}
                options={offerOptions}
                active={filters.offer !== 'all'}
                onChange={(offer) => onChange({ offer })}
            />
            <FilterChip
                label="Note"
                value={String(filters.minScore)}
                options={scoreOptions}
                active={filters.minScore > 0}
                onChange={(value) => onChange({ minScore: Number(value) })}
            />
            {dirty && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-8 rounded-full"
                    onClick={() => onChange(defaultFilters)}
                >
                    <X />
                    Réinitialiser
                </Button>
            )}
            <div className="ml-auto">
                <FilterChip
                    label="Trier"
                    value={filters.sort}
                    options={sortOptions}
                    active={filters.sort !== 'manual'}
                    onChange={(sort) => onChange({ sort })}
                    icon={
                        <ArrowUpDown
                            className="size-3.5 shrink-0"
                            aria-hidden
                        />
                    }
                    align="end"
                />
            </div>
        </div>
    );
}
