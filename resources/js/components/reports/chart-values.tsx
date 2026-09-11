import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/**
 * Tableau des valeurs sous un graphique, replié par défaut : bouton discret avec
 * chevron, plutôt que le `<details>` brut du navigateur.
 */
export function ChartValues({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-4">
            <CollapsibleTrigger
                className={cn(
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                )}
            >
                <ChevronDown
                    aria-hidden="true"
                    className={cn(
                        'size-4 transition-transform duration-200',
                        open && 'rotate-180',
                    )}
                />
                {label}
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                <div className="pt-3">{children}</div>
            </CollapsibleContent>
        </Collapsible>
    );
}
