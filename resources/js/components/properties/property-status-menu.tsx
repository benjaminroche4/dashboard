import { router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
    propertyStatusDots,
    propertyStatusTones,
    PropertyStatusBadge,
} from '@/components/properties/property-status-badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { status as propertyStatusRoute } from '@/routes/properties';
import type { LabeledOption, PropertyStatus } from '@/types';

/**
 * Disponibilité d'un bien, changée d'un geste depuis sa fiche — même principe
 * que le badge de statut d'un lead sur le kanban.
 */
export function PropertyStatusMenu({
    property,
    statuses,
}: {
    property: {
        uuid: string;
        label: string;
        status: PropertyStatus;
        status_label: string;
    };
    statuses: LabeledOption<PropertyStatus>[];
}) {
    const [pending, setPending] = useState(false);

    const change = (value: PropertyStatus) => {
        if (value === property.status) {
            return;
        }

        setPending(true);
        router.patch(
            propertyStatusRoute({ property: property.uuid }).url,
            { status: value },
            { preserveScroll: true, onFinish: () => setPending(false) },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={`Changer la disponibilité de ${property.label}`}
                disabled={pending}
                className="max-w-full rounded-full outline-none focus-visible:ring-2"
            >
                <PropertyStatusBadge
                    status={property.status}
                    label={property.status_label}
                    className="cursor-pointer gap-1 pr-1.5 transition-opacity hover:opacity-80"
                />
                <ChevronDown
                    aria-hidden
                    className="pointer-events-none -ml-5 inline size-3 opacity-70"
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
                {statuses.map((option) => {
                    const current = option.value === property.status;

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            aria-current={current ? 'true' : undefined}
                            onSelect={() => change(option.value)}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    propertyStatusDots[option.value],
                                )}
                            />
                            <span
                                className={cn(
                                    'flex-1 truncate text-sm',
                                    current && 'font-medium',
                                )}
                            >
                                {option.label}
                            </span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export { propertyStatusTones };
