import { Loader2, MapPin } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
    fetchPlaceSuggestions,
    type PlaceSuggestion,
    type PlacesSession,
    type ResolvedAddress,
} from '@/lib/google-places';
import { cn } from '@/lib/utils';

type Props = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onSelect: (address: ResolvedAddress) => void;
    /** Faux quand la clé Google n'est pas configurée : champ texte ordinaire. */
    enabled?: boolean;
    /** Codes pays (ISO alpha-2) qui restreignent la recherche. */
    regionCodes?: string[];
    placeholder?: string;
    className?: string;
};

/**
 * Champ d'adresse avec suggestions Google Places (via le proxy Laravel).
 */
export function AddressAutocomplete({
    id,
    value,
    onChange,
    onSelect,
    enabled = true,
    regionCodes = ['ch', 'fr'],
    placeholder = 'Rue et numéro',
    className,
}: Props) {
    const listId = useId();
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const session = useRef<PlacesSession>({});
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestId = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Ferme la liste au clic à l'extérieur.
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onClick);

        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const search = (input: string) => {
        if (timer.current) {
            clearTimeout(timer.current);
        }

        if (!enabled || input.trim().length < 3) {
            setSuggestions([]);
            setOpen(false);

            return;
        }

        timer.current = setTimeout(async () => {
            const current = ++requestId.current;
            setLoading(true);

            try {
                const results = await fetchPlaceSuggestions(
                    input,
                    regionCodes,
                    session.current,
                );

                // Ignore une réponse arrivée après une saisie plus récente.
                if (current !== requestId.current) {
                    return;
                }

                setSuggestions(results);
                setActive(0);
                setOpen(results.length > 0);
            } catch (error) {
                console.warn('Autocomplétion d’adresse indisponible', error);
                setSuggestions([]);
                setOpen(false);
            } finally {
                if (current === requestId.current) {
                    setLoading(false);
                }
            }
        }, 250);
    };

    const choose = async (suggestion: PlaceSuggestion) => {
        setOpen(false);
        setLoading(true);

        try {
            const address = await suggestion.resolve();

            onChange(address.street || suggestion.main);
            onSelect(address);
        } catch (error) {
            console.warn('Détail de l’adresse indisponible', error);
            onChange(suggestion.main);
        } finally {
            session.current = {};
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <Input
                id={id}
                role={enabled ? 'combobox' : undefined}
                aria-expanded={enabled ? open : undefined}
                aria-controls={enabled ? listId : undefined}
                aria-autocomplete={enabled ? 'list' : undefined}
                autoComplete="off"
                className="bg-background pr-9"
                placeholder={placeholder}
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                    search(event.target.value);
                }}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                onKeyDown={(event) => {
                    if (!open || suggestions.length === 0) {
                        return;
                    }

                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setActive((index) => (index + 1) % suggestions.length);
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActive(
                            (index) =>
                                (index - 1 + suggestions.length) %
                                suggestions.length,
                        );
                    } else if (event.key === 'Enter') {
                        event.preventDefault();
                        void choose(suggestions[active]);
                    } else if (event.key === 'Escape') {
                        setOpen(false);
                    }
                }}
            />
            {enabled && (
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                    {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <MapPin className="size-4" />
                    )}
                </span>
            )}

            {open && suggestions.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full overflow-hidden rounded-md border p-1 shadow-md"
                >
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.id}
                            role="option"
                            aria-selected={index === active}
                            className={cn(
                                'flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm',
                                index === active &&
                                    'bg-accent text-accent-foreground',
                            )}
                            onMouseEnter={() => setActive(index)}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => void choose(suggestion)}
                        >
                            <span>{suggestion.main}</span>
                            {suggestion.secondary && (
                                <span className="text-muted-foreground text-xs">
                                    {suggestion.secondary}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
