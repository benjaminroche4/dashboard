import { router } from '@inertiajs/react';
import { ChevronDown, Flag } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { priority as clientPriority } from '@/routes/clients';
import type { ClientPriority, ClientPriorityOption } from '@/types';

/** Teinte par priorité : neutre pour « Normale », ambre puis rouge quand ça presse. */
export const priorityTones: Record<ClientPriority, string> = {
    low: 'bg-muted text-muted-foreground border-transparent',
    normal: 'bg-secondary text-secondary-foreground border-transparent',
    high: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    urgent: 'border-transparent bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
};

/** Pastille « Priorité : Haute », cachée par défaut pour une priorité normale. */
export function ClientPriorityBadge({
    priority,
    label,
    showNormal = false,
    className,
}: {
    priority: ClientPriority;
    label: string;
    showNormal?: boolean;
    className?: string;
}) {
    if (priority === 'normal' && !showNormal) {
        return null;
    }

    return (
        <Badge
            className={cn(
                'gap-1 font-medium',
                priorityTones[priority],
                className,
            )}
            aria-label={`Priorité : ${label}`}
        >
            <Flag className="size-3" aria-hidden />
            {label}
        </Badge>
    );
}

/**
 * Menu de la fiche dossier : la priorité courante en bouton, les autres
 * en choix radio. Le changement part en PATCH sur `clients.priority`.
 */
export function ClientPriorityMenu({
    uuid,
    priority,
    priorities,
}: {
    uuid: string;
    priority: ClientPriority;
    priorities: ClientPriorityOption[];
}) {
    const [busy, setBusy] = useState(false);
    const current =
        priorities.find((option) => option.value === priority)?.label ??
        priority;

    const change = (value: string) => {
        if (value === priority) {
            return;
        }

        setBusy(true);
        router.patch(
            clientPriority({ lead: uuid }).url,
            { priority: value },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    aria-label={`Priorité : ${current}`}
                    className={cn('gap-1.5', priorityTones[priority])}
                >
                    <Flag aria-hidden />
                    Priorité : {current}
                    <ChevronDown className="opacity-60" aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Priorité du dossier</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={priority} onValueChange={change}>
                    {priorities.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
