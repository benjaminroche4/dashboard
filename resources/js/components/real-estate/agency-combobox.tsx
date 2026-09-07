import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
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
import type { AgencyOption } from '@/types';

/**
 * Sélecteur d'agence avec recherche : la liste se filtre au fil de la frappe,
 * « Indépendant » retire l'agence. La valeur est l'identifiant numérique de
 * l'agence (clé étrangère `agency_id`), chaîne vide sans agence.
 */
export function AgencyCombobox({
    id,
    value,
    onChange,
    agencies,
    disabled = false,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    agencies: AgencyOption[];
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const selected = agencies.find((agency) => String(agency.id) === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Agence"
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    <span
                        className={cn(
                            'truncate',
                            !selected && 'text-muted-foreground',
                        )}
                    >
                        {selected?.name ?? 'Indépendant (sans agence)'}
                    </span>
                    <ChevronsUpDown className="opacity-50" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Rechercher une agence…" />
                    <CommandList>
                        <CommandEmpty>
                            Aucune agence ne correspond.
                        </CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="__none"
                                onSelect={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        !selected ? 'opacity-100' : 'opacity-0',
                                    )}
                                    aria-hidden
                                />
                                Indépendant (sans agence)
                            </CommandItem>
                            {agencies.map((agency) => (
                                <CommandItem
                                    key={agency.id}
                                    value={agency.name}
                                    onSelect={() => {
                                        onChange(String(agency.id));
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            selected?.id === agency.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                        aria-hidden
                                    />
                                    {agency.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
