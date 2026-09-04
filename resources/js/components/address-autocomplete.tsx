import { Loader2, MapPin } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
    googleMapsApiKey,
    loadGooglePlaces,
    parseAddressComponents,
    type ResolvedAddress,
} from '@/lib/google-places';
import { cn } from '@/lib/utils';

type Suggestion = {
    id: string;
    main: string;
    secondary: string;
    toPlace: () => google.maps.places.Place;
};

type Props = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onSelect: (address: ResolvedAddress) => void;
    /** Codes pays (ISO alpha-2) qui restreignent la recherche. */
    regionCodes?: string[];
    placeholder?: string;
    className?: string;
};

/**
 * Champ d'adresse avec suggestions Google Places (API « New »).
 * Sans clé configurée, c'est un champ texte ordinaire.
 */
export function AddressAutocomplete({
    id,
    value,
    onChange,
    onSelect,
    regionCodes = ['ch', 'fr'],
    placeholder = 'Rue et numéro',
    className,
}: Props) {
    const enabled = googleMapsApiKey() !== '';
    const listId = useId();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const sessionToken =
        useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
            setLoading(true);

            try {
                const places = await loadGooglePlaces();
                sessionToken.current ??= new places.AutocompleteSessionToken();

                const { suggestions: results } =
                    await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
                        {
                            input,
                            sessionToken: sessionToken.current,
                            language: 'fr',
                            includedRegionCodes: regionCodes,
                        },
                    );

                setSuggestions(
                    results
                        .filter((result) => result.placePrediction)
                        .map((result) => {
                            const prediction = result.placePrediction!;

                            return {
                                id: prediction.placeId,
                                main:
                                    prediction.mainText?.text ??
                                    prediction.text.text,
                                secondary: prediction.secondaryText?.text ?? '',
                                toPlace: () => prediction.toPlace(),
                            };
                        }),
                );
                setActive(0);
                setOpen(true);
            } catch (error) {
                console.warn(
                    'Autocomplétion Google Places indisponible',
                    error,
                );
                setSuggestions([]);
                setOpen(false);
            } finally {
                setLoading(false);
            }
        }, 250);
    };

    const choose = async (suggestion: Suggestion) => {
        setOpen(false);
        setLoading(true);

        try {
            const place = suggestion.toPlace();
            await place.fetchFields({ fields: ['addressComponents'] });
            const address = parseAddressComponents(place.addressComponents);

            onChange(address.street || suggestion.main);
            onSelect(address);
        } catch {
            onChange(suggestion.main);
        } finally {
            sessionToken.current = null;
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
                        setActive(
                            (current) => (current + 1) % suggestions.length,
                        );
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActive(
                            (current) =>
                                (current - 1 + suggestions.length) %
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
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <MapPin className="size-4" />
                )}
            </span>

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
