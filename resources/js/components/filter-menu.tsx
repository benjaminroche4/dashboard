import { SlidersHorizontal, X } from 'lucide-react';
import type { ReactNode } from 'react';
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

export type FilterMenuOption<T extends string> = {
    value: T;
    label: string;
    icon?: ReactNode;
};

/** Un critère du menu : son intitulé, ses choix et ce qui est coché. */
export type FilterMenuGroup<T extends string = string> = {
    /** En-tête de la section, ex. « Type de partenaire ». */
    title: string;
    options: FilterMenuOption<T>[];
    counts: Partial<Record<T, number>>;
    /** Choix cochés ; vide = tout. */
    value: T[];
    onChange: (value: T[]) => void;
};

/**
 * Filtre multi-sélection dans le style de la barre de filtres des leads :
 * un bouton « Filtres » avec le nombre de choix cochés en badge, un menu à
 * cases à cocher (compteur par choix), et un bouton « Réinitialiser » dès
 * qu'un filtre est actif. Plusieurs critères peuvent cohabiter dans le même
 * menu : une section par critère.
 */
export function FilterMenu<T extends string>({
    title,
    options,
    counts,
    value,
    onChange,
    groups,
}: {
    title?: string;
    options?: FilterMenuOption<T>[];
    counts?: Partial<Record<T, number>>;
    value?: T[];
    onChange?: (value: T[]) => void;
    /** Plusieurs critères ; sinon, le critère unique passé à plat. */
    groups?: FilterMenuGroup[];
}) {
    const sections: FilterMenuGroup[] =
        groups ??
        (title !== undefined &&
        options !== undefined &&
        counts !== undefined &&
        value !== undefined &&
        onChange !== undefined
            ? [
                  {
                      title,
                      options: options as FilterMenuOption<string>[],
                      counts: counts as Partial<Record<string, number>>,
                      value,
                      onChange: onChange as (value: string[]) => void,
                  },
              ]
            : []);

    const activeCount = sections.reduce(
        (total, section) => total + section.value.length,
        0,
    );
    const toggle = (
        section: FilterMenuGroup,
        option: string,
        checked: boolean,
    ) =>
        section.onChange(
            checked
                ? [...section.value, option]
                : section.value.filter((current) => current !== option),
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
                    className="max-h-[70dvh] w-60 overflow-y-auto"
                >
                    {sections.map((section, index) => (
                        <div key={section.title}>
                            {index > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuLabel>
                                {section.title}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {section.options.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={section.value.includes(
                                        option.value,
                                    )}
                                    onCheckedChange={(checked) =>
                                        toggle(
                                            section,
                                            option.value,
                                            checked === true,
                                        )
                                    }
                                    // Le menu reste ouvert pour cocher plusieurs choix.
                                    onSelect={(event) => event.preventDefault()}
                                >
                                    {option.icon}
                                    {option.label}
                                    <span className="text-muted-foreground ml-auto pl-4 text-xs tabular-nums">
                                        {section.counts[option.value] ?? 0}
                                    </span>
                                </DropdownMenuCheckboxItem>
                            ))}
                        </div>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {activeCount > 0 && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        sections.forEach((section) => section.onChange([]))
                    }
                >
                    <X />
                    Réinitialiser
                </Button>
            )}
        </div>
    );
}
