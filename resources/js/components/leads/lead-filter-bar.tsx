import { usePage } from '@inertiajs/react';
import {
    ArrowUpDown,
    Search,
    SlidersHorizontal,
    Star,
    UserRound,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
 * Barre de filtres du kanban : recherche, avatars des responsables, et un
 * bouton « Filtres » qui regroupe offre, note minimale et tri.
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
    const activeCount =
        Number(filters.offer !== 'all') +
        Number(filters.minScore > 0) +
        Number(filters.assignee !== 'all');

    const search = (className = 'w-full sm:max-w-xs') => (
        <div className={cn('relative', className)}>
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
                onChange={(event) => onChange({ query: event.target.value })}
                className="bg-background h-8 pl-8"
            />
        </div>
    );
    const avatars = (
        <AssigneeAvatars
            leads={leads}
            value={filters.assignee}
            onChange={(assignee) => onChange({ assignee })}
        />
    );
    const reset = dirty && (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(defaultFilters)}
        >
            <X />
            Réinitialiser
        </Button>
    );
    const offerSelect = (
        <Select
            value={filters.offer}
            onValueChange={(offer) =>
                onChange({ offer: offer as OfferValue | 'all' })
            }
        >
            <SelectTrigger
                aria-label="Offre"
                size="sm"
                className="bg-background w-40"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {offerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
    const scoreSelect = (
        <Select
            value={String(filters.minScore)}
            onValueChange={(value) => onChange({ minScore: Number(value) })}
        >
            <SelectTrigger
                aria-label="Note"
                size="sm"
                className="bg-background w-40"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {scoreOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.icon}
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
    const sortSelect = (
        <Select
            value={filters.sort}
            onValueChange={(sort) => onChange({ sort: sort as LeadSortKey })}
        >
            <SelectTrigger
                aria-label="Trier"
                size="sm"
                className="bg-background w-40"
            >
                <ArrowUpDown className="size-3.5" aria-hidden />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
    const filtersPopover = (
        <Popover>
            <PopoverTrigger asChild>
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
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-64 gap-3">
                <div className="grid gap-1.5">
                    <p className="text-muted-foreground text-xs">Offre</p>
                    {offerSelect}
                </div>
                <div className="grid gap-1.5">
                    <p className="text-muted-foreground text-xs">
                        Note minimale
                    </p>
                    {scoreSelect}
                </div>
                <div className="grid gap-1.5">
                    <p className="text-muted-foreground text-xs">Tri</p>
                    {sortSelect}
                </div>
            </PopoverContent>
        </Popover>
    );

    return (
        <div className="flex flex-wrap items-center gap-2 pb-4">
            {search()}
            {avatars}
            {filtersPopover}
            {reset}
        </div>
    );
}
