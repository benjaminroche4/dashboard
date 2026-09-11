import { Building2, House, Plus } from 'lucide-react';
import InputError from '@/components/input-error';
import { SearchSelect } from '@/components/search-select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { VisitPropertyOption } from '@/types';

export type PropertySource = 'existing' | 'new';

const sources: {
    value: PropertySource;
    label: string;
    hint: string;
    icon: typeof House;
}[] = [
    {
        value: 'existing',
        label: 'Un bien de l’annuaire',
        hint: 'Déjà enregistré dans « Biens »',
        icon: House,
    },
    {
        value: 'new',
        label: 'Nouveau bien',
        hint: 'Saisi ici, ajouté à l’annuaire',
        icon: Plus,
    },
];

/** Vignette de la photo principale d'un bien, ou une icône à défaut. */
export function PropertyThumb({
    photo,
    label,
    className,
}: {
    photo?: string | null;
    label: string;
    className?: string;
}) {
    return photo ? (
        <img
            src={photo}
            alt={`Photo de ${label}`}
            loading="lazy"
            className={cn('size-8 shrink-0 rounded-md object-cover', className)}
        />
    ) : (
        <span
            aria-hidden
            className={cn(
                'bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md',
                className,
            )}
        >
            <Building2 className="size-4" />
        </span>
    );
}

/**
 * Choix du bien d'une visite : deux cartes « Un bien de l'annuaire » / « Nouveau
 * bien », puis, pour l'annuaire, la liste des biens avec leur photo principale.
 */
export function PropertyPicker({
    source,
    onSourceChange,
    properties,
    propertyId,
    onPropertyChange,
    error,
    lockExisting = false,
}: {
    source: PropertySource;
    onSourceChange: (source: PropertySource) => void;
    properties: VisitPropertyOption[];
    propertyId: string;
    onPropertyChange: (id: string) => void;
    error?: string;
    /** Modification d'une visite : le bien se choisit dans l'annuaire. */
    lockExisting?: boolean;
}) {
    return (
        <div className="grid gap-4">
            <div className={cn('grid gap-2', lockExisting && 'hidden')}>
                <Label id="visit-source-label">Bien à visiter</Label>
                <div
                    role="radiogroup"
                    aria-labelledby="visit-source-label"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                    {sources.map(({ value, label, hint, icon: Icon }) => {
                        const active = source === value;
                        const disabled =
                            value === 'existing' && properties.length === 0;

                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-label={label}
                                disabled={disabled}
                                onClick={() => onSourceChange(value)}
                                className={cn(
                                    'focus-visible:ring-ring/50 flex items-start gap-3 rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                                    active
                                        ? 'border-primary/40 bg-muted'
                                        : 'hover:bg-accent/60',
                                )}
                            >
                                <Icon
                                    className="text-foreground mt-0.5 size-5 shrink-0"
                                    aria-hidden
                                />
                                <span className="grid min-w-0 flex-1 gap-1">
                                    <span className="text-sm font-medium">
                                        {label}
                                    </span>
                                    <span className="text-muted-foreground text-sm">
                                        {disabled
                                            ? 'L’annuaire est vide'
                                            : hint}
                                    </span>
                                </span>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border',
                                        active
                                            ? 'bg-primary border-primary'
                                            : 'bg-background',
                                    )}
                                >
                                    {active && (
                                        <span className="bg-background size-1.5 rounded-full" />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <InputError message={error} />
            </div>

            {source === 'existing' && (
                <div className="grid gap-2">
                    <Label htmlFor="visit-property">Bien</Label>
                    <SearchSelect
                        id="visit-property"
                        value={propertyId}
                        onChange={onPropertyChange}
                        placeholder="Choisir un bien"
                        searchPlaceholder="Rechercher un bien (titre, adresse)…"
                        noResults="Aucun bien ne correspond."
                        options={properties.map((property) => ({
                            value: String(property.id),
                            label: property.label,
                            hint:
                                property.label !== property.street
                                    ? property.street
                                    : [property.postal_code, property.city]
                                          .filter(Boolean)
                                          .join(' ') || null,
                            keywords: [
                                property.street,
                                property.postal_code ?? '',
                                property.city ?? '',
                            ],
                            leading: (
                                <PropertyThumb
                                    photo={property.photo}
                                    label={property.label}
                                    className="size-7"
                                />
                            ),
                        }))}
                    />
                </div>
            )}
        </div>
    );
}
