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

/**
 * Filtre multi-sélection dans le style de la barre de filtres des leads :
 * un bouton « Filtres » avec le nombre de choix cochés en badge, un menu à
 * cases à cocher (compteur par choix), et un bouton « Réinitialiser » dès
 * qu'un filtre est actif.
 */
export function FilterMenu<T extends string>({
    title,
    options,
    counts,
    value,
    onChange,
}: {
    /** En-tête du menu, ex. « Type de partenaire ». */
    title: string;
    options: FilterMenuOption<T>[];
    counts: Partial<Record<T, number>>;
    /** Choix cochés ; vide = tout. */
    value: T[];
    onChange: (value: T[]) => void;
}) {
    const activeCount = value.length;
    const toggle = (option: T, checked: boolean) =>
        onChange(
            checked
                ? [...value, option]
                : value.filter((current) => current !== option),
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
                    <DropdownMenuLabel>{title}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {options.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            checked={value.includes(option.value)}
                            onCheckedChange={(checked) =>
                                toggle(option.value, checked === true)
                            }
                            // Le menu reste ouvert pour cocher plusieurs choix.
                            onSelect={(event) => event.preventDefault()}
                        >
                            {option.icon}
                            {option.label}
                            <span className="text-muted-foreground ml-auto pl-4 text-xs tabular-nums">
                                {counts[option.value] ?? 0}
                            </span>
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
