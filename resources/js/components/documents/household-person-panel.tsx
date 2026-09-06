import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { categoryIcon } from '@/lib/document-category-icons';
import { cn } from '@/lib/utils';
import type { HouseholdPersonDetail } from '@/types';

/**
 * Personne du foyer sur la fiche : en-tête repliable (nom, rôle, nombre de
 * pièces), puis les pièces regroupées par catégorie.
 */
export function HouseholdPersonPanel({
    person,
    index,
    defaultOpen = true,
}: {
    person: HouseholdPersonDetail;
    index: number;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const name = person.name !== '' ? person.name : `Personne ${index + 1}`;
    const count = person.categories.reduce(
        (total, category) => total + category.documents.length,
        0,
    );

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <section aria-label={name} className="bg-sidebar rounded-xl border">
                <header className="flex items-center justify-between gap-3 px-4 py-3">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            aria-label={`${open ? 'Replier' : 'Déplier'} ${name}`}
                        >
                            <ChevronDown
                                aria-hidden="true"
                                className={cn(
                                    'text-muted-foreground size-4 shrink-0 transition-transform',
                                    !open && '-rotate-90',
                                )}
                            />
                            <h2 className="truncate text-sm font-medium">
                                {name}
                            </h2>
                            <span className="text-muted-foreground text-xs tabular-nums">
                                {count === 1 ? '1 pièce' : `${count} pièces`}
                            </span>
                        </button>
                    </CollapsibleTrigger>
                    <Badge variant="outline">{person.role}</Badge>
                </header>
                <CollapsibleContent>
                    <div className="grid gap-4 px-4 pb-4">
                        {person.categories.map((category) => {
                            const Icon = categoryIcon(category.value);

                            return (
                                <section
                                    key={category.value}
                                    aria-label={category.label}
                                    className="grid gap-1.5"
                                >
                                    <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-4 shrink-0"
                                        />
                                        {category.label}
                                        <span className="bg-background text-foreground inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 text-[11px] font-medium tabular-nums">
                                            {category.documents.length}
                                        </span>
                                    </h3>
                                    <ul className="bg-background divide-y rounded-lg border px-3">
                                        {category.documents.map((document) => (
                                            <li
                                                key={document.label}
                                                className="py-2"
                                            >
                                                <div className="text-sm">
                                                    {document.label}
                                                </div>
                                                {document.hint && (
                                                    <div className="text-muted-foreground text-xs">
                                                        {document.hint}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                </CollapsibleContent>
            </section>
        </Collapsible>
    );
}
