import { Check, ChevronsUpDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type SearchSelectOption = {
    value: string;
    label: string;
    /** Texte secondaire (référence, adresse…), cherché lui aussi. */
    hint?: string | null;
    /** Mots supplémentaires pour la recherche. */
    keywords?: string[];
    /** Vignette ou avatar à gauche du libellé. */
    leading?: ReactNode;
};

/**
 * Liste déroulante avec recherche (shadcn Combobox : Popover + Command).
 * Valeur vide = rien de choisi ; `emptyLabel` propose de la remettre à vide.
 */
export function SearchSelect({
    id,
    value,
    onChange,
    options,
    placeholder = 'Choisir…',
    searchPlaceholder = 'Rechercher…',
    emptyLabel,
    noResults = 'Aucun résultat.',
    disabled = false,
    className,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: SearchSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    /** Entrée « aucun » en tête de liste, qui vide la valeur. */
    emptyLabel?: string;
    noResults?: string;
    disabled?: boolean;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal shadow-xs',
                        !selected && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {selected?.leading}
                        <span className="truncate">
                            {selected ? selected.label : placeholder}
                        </span>
                        {selected?.hint && (
                            <span className="text-muted-foreground truncate text-xs">
                                {selected.hint}
                            </span>
                        )}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
            >
                <Command
                    filter={(itemValue, search, keywords) => {
                        const haystack = [itemValue, ...(keywords ?? [])]
                            .join(' ')
                            .toLocaleLowerCase('fr');

                        return haystack.includes(search.toLocaleLowerCase('fr'))
                            ? 1
                            : 0;
                    }}
                >
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{noResults}</CommandEmpty>
                        <CommandGroup>
                            {emptyLabel && (
                                <CommandItem
                                    value="__none__"
                                    keywords={[emptyLabel]}
                                    onSelect={() => {
                                        onChange('');
                                        setOpen(false);
                                    }}
                                >
                                    <span className="text-muted-foreground">
                                        {emptyLabel}
                                    </span>
                                    <Check
                                        className={cn(
                                            'ml-auto size-4',
                                            value === ''
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                </CommandItem>
                            )}
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    keywords={[
                                        option.label,
                                        option.hint ?? '',
                                        ...(option.keywords ?? []),
                                    ]}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    {option.leading}
                                    <span className="grid min-w-0">
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                        {option.hint && (
                                            <span className="text-muted-foreground truncate text-xs">
                                                {option.hint}
                                            </span>
                                        )}
                                    </span>
                                    <Check
                                        className={cn(
                                            'ml-auto size-4 shrink-0',
                                            value === option.value
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
