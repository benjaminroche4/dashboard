import { usePage } from '@inertiajs/react';
import {
    ArrowUpDown,
    Check,
    ChevronDown,
    Search,
    Star,
    UserRound,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { defaultFilters, type LeadFilters } from '@/lib/kanban';
import { cn } from '@/lib/utils';
import type {
    Lead,
    LeadAssigneeFilter,
    LeadOfferOption,
    LeadSortKey,
    OfferValue,
} from '@/types';

type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

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
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant={active ? 'secondary' : 'outline'}
                    size="sm"
                    aria-label={label}
                    data-active={active ? '' : undefined}
                    className="max-w-56"
                >
                    {icon}
                    <span className="truncate">
                        {active ? current?.label : label}
                    </span>
                    <ChevronDown className="opacity-60" aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-52">
                {options.map((option) => {
                    const selected = option.value === value;

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            aria-current={selected ? 'true' : undefined}
                            onSelect={() => onChange(option.value)}
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
 * Filtre par responsable : un avatar par membre ayant au moins un lead,
 * plus « Non attribués » s'il y en a. Un clic filtre, un second annule.
 */
function AssigneeAvatars({
    leads,
    value,
    onChange,
}: {
    leads: Lead[];
    value: LeadAssigneeFilter;
    onChange: (value: LeadAssigneeFilter) => void;
}) {
    const { auth } = usePage().props;
    const members = new Map<number, { name: string; count: number }>();
    let unassigned = 0;

    for (const lead of leads) {
        if (lead.assignee) {
            const entry = members.get(lead.assignee.id) ?? {
                name: lead.assignee.name,
                count: 0,
            };
            entry.count += 1;
            members.set(lead.assignee.id, entry);
        } else {
            unassigned += 1;
        }
    }

    // Moi d'abord, puis par nombre de leads.
    const ordered = [...members.entries()].sort(([idA, a], [idB, b]) => {
        if (idA === auth.user?.id) {
            return -1;
        }

        if (idB === auth.user?.id) {
            return 1;
        }

        return b.count - a.count;
    });

    if (ordered.length === 0 && unassigned === 0) {
        return null;
    }

    const toggle = (next: LeadAssigneeFilter) =>
        onChange(value === next ? 'all' : next);

    return (
        <TooltipProvider delayDuration={0}>
            <div
                role="group"
                aria-label="Responsable"
                className="flex items-center gap-1"
            >
                {ordered.map(([id, member]) => {
                    const active = value === id;
                    const mine = id === auth.user?.id;
                    const label = `${mine ? 'Mes leads' : member.name} (${member.count})`;

                    return (
                        <Tooltip key={id}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={label}
                                    aria-pressed={active}
                                    onClick={() => toggle(id)}
                                    className={cn(
                                        'rounded-full transition-opacity outline-none focus-visible:ring-2',
                                        value !== 'all' &&
                                            !active &&
                                            'opacity-40 hover:opacity-80',
                                    )}
                                >
                                    <Avatar
                                        className={cn(
                                            'size-8 ring-2',
                                            active
                                                ? 'ring-primary'
                                                : 'ring-background',
                                        )}
                                    >
                                        <AvatarFallback
                                            className={cn(
                                                'text-xs font-medium',
                                                memberTone(id),
                                            )}
                                        >
                                            {initials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                    );
                })}
                {unassigned > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Non attribués (${unassigned})`}
                                aria-pressed={value === 'none'}
                                onClick={() => toggle('none')}
                                className={cn(
                                    'rounded-full transition-opacity outline-none focus-visible:ring-2',
                                    value !== 'all' &&
                                        value !== 'none' &&
                                        'opacity-40 hover:opacity-80',
                                )}
                            >
                                <span
                                    className={cn(
                                        'bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full border border-dashed ring-2',
                                        value === 'none'
                                            ? 'ring-primary'
                                            : 'ring-background',
                                    )}
                                >
                                    <UserRound
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                </span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Non attribués ({unassigned})
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}

/**
 * Barre de filtres du kanban : recherche, avatars des responsables,
 * pastilles de filtre et tri.
 */
export function LeadFilterBar({
    filters,
    offers,
    leads,
    onChange,
}: {
    filters: LeadFilters;
    offers: LeadOfferOption[];
    /** Tous les leads (avant filtrage), pour connaître les responsables présents. */
    leads: Lead[];
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
            <div className="relative w-full sm:max-w-xs">
                <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                    aria-hidden
                />
                <Input
                    type="search"
                    name="query"
                    aria-label="Filtrer les leads"
                    placeholder="Rechercher un lead…"
                    value={filters.query}
                    onChange={(event) =>
                        onChange({ query: event.target.value })
                    }
                    className="bg-background h-8 pl-8"
                />
            </div>
            <AssigneeAvatars
                leads={leads}
                value={filters.assignee}
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
