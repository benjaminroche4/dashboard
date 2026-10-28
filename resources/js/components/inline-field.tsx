import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { DatePicker } from '@/components/date-picker';
import { ChoicePills } from '@/components/leads/condition-choices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { LabeledOption } from '@/types';

/** Valeur vide d'un `Select` Radix (qui refuse la chaîne vide). */
const NONE = '__none__';

/** Ce qu'un champ modifiable en place sait éditer. */
export type InlineEdit =
    | { kind: 'text'; value: string | null; placeholder?: string }
    | {
          /** Ville cherchée dans Google Places ; enregistre aussi le pays (drapeau). */
          kind: 'city';
          value: string | null;
          country: string | null;
          /** Faux sans clé Google : simple texte. */
          enabled: boolean;
      }
    | { kind: 'textarea'; value: string | null; placeholder?: string }
    | {
          /** Montant en unités, enregistré en centimes. */
          kind: 'money';
          value: number | null;
          suffix?: string;
      }
    | { kind: 'date'; value: string | null }
    | { kind: 'select'; value: string | null; options: LabeledOption[] }
    | { kind: 'multi'; value: string[]; options: LabeledOption[] }
    | {
          /** Arrondissements 1 à 20. */
          kind: 'districts';
          value: number[];
      };

export type InlineValue =
    | string
    | number
    | string[]
    | number[]
    | null
    | { [field: string]: string | null };

/** Valeur d'un champ ville : la ville et son pays. */
type CityDraft = { city: string; country: string | null };

type Props = {
    /** Libellé du champ, pour le nom accessible du bouton (« Modifier Budget mensuel »). */
    label: string;
    /** Rendu de la valeur en lecture. */
    display: ReactNode;
    edit: InlineEdit;
    /** Ouvert de l'extérieur (bouton « À compléter »), refermé par `onClose`. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    saving?: boolean;
    onSave: (value: InlineValue) => void;
    className?: string;
};

const districtOptions: LabeledOption[] = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}${i === 0 ? 'er' : 'e'}`,
}));

/**
 * Un champ qui se modifie là où il se lit (28 octobre 2026) : la valeur est
 * un bouton avec un crayon au survol ; au clic, elle cède la place à son
 * contrôle. Entrée enregistre, Échap annule ; un choix dans une liste
 * s'enregistre aussitôt, les listes multiples et les textes attendent ✓.
 * Pas d'enregistrement silencieux sur un texte libre.
 */
export function InlineField({
    label,
    display,
    edit,
    open,
    onOpenChange,
    saving = false,
    onSave,
    className,
}: Props) {
    const [innerOpen, setInnerOpen] = useState(false);
    const editing = open ?? innerOpen;
    const setEditing = (next: boolean) => {
        setInnerOpen(next);
        onOpenChange?.(next);
    };
    const [draft, setDraft] = useState<InlineValue>(() => initial(edit));
    const wasSaving = useRef(false);

    // À l'ouverture, on repart de la valeur enregistrée.
    useEffect(() => {
        if (editing) {
            setDraft(initial(edit));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing]);

    // L'enregistrement terminé referme le champ.
    useEffect(() => {
        if (wasSaving.current && !saving) {
            setEditing(false);
        }
        wasSaving.current = saving;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saving]);

    const save = (value: InlineValue = draft) => onSave(normalize(edit, value));
    const cancel = () => setEditing(false);
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
        if (
            event.key === 'Enter' &&
            (edit.kind !== 'textarea' || event.metaKey || event.ctrlKey)
        ) {
            event.preventDefault();
            save();
        }
    };

    if (!editing) {
        return (
            <button
                type="button"
                aria-label={`Modifier ${label}`}
                onClick={() => setEditing(true)}
                className={cn(
                    'group/inline hover:bg-muted focus-visible:ring-ring/50 -mx-1.5 -my-1 flex max-w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors outline-none focus-visible:ring-3',
                    className,
                )}
            >
                <span className="min-w-0 [overflow-wrap:anywhere]">
                    {display}
                </span>
                <Pencil
                    aria-hidden
                    className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
                />
            </button>
        );
    }

    const actions = (
        <div className="flex shrink-0 items-center gap-1">
            <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Enregistrer"
                disabled={saving}
                onClick={() => save()}
            >
                {saving ? <Spinner /> : <Check aria-hidden />}
            </Button>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Annuler"
                disabled={saving}
                onClick={cancel}
            >
                <X aria-hidden />
            </Button>
        </div>
    );

    switch (edit.kind) {
        case 'text':
            return (
                <div className="flex w-full items-center gap-2">
                    <Input
                        autoFocus
                        aria-label={label}
                        placeholder={edit.placeholder}
                        value={(draft as string | null) ?? ''}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={onKeyDown}
                        className="h-8"
                    />
                    {actions}
                </div>
            );
        case 'city': {
            const city = draft as CityDraft;

            return (
                <div
                    className="flex w-full items-center gap-2"
                    onKeyDown={onKeyDown}
                >
                    <AddressAutocomplete
                        kind="cities"
                        regionCodes={[]}
                        enabled={edit.enabled}
                        placeholder="Genève, Londres, New York…"
                        value={city.city}
                        onChange={(value) =>
                            // Texte tapé sans choisir : le pays n'est plus sûr.
                            setDraft({ city: value, country: null })
                        }
                        onSelect={(address) =>
                            setDraft({
                                city: address.city,
                                country: address.countryCode,
                            })
                        }
                        className="w-full max-w-72"
                    />
                    {actions}
                </div>
            );
        }
        case 'textarea':
            return (
                <div className="grid w-full gap-2">
                    <Textarea
                        autoFocus
                        aria-label={label}
                        rows={3}
                        placeholder={edit.placeholder}
                        value={(draft as string | null) ?? ''}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <div className="flex justify-end">{actions}</div>
                </div>
            );
        case 'money':
            return (
                <div className="flex w-full items-center gap-2">
                    <Input
                        autoFocus
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1}
                        aria-label={label}
                        value={typeof draft === 'number' ? draft : ''}
                        onChange={(event) =>
                            setDraft(
                                event.target.value === ''
                                    ? null
                                    : Number(event.target.value),
                            )
                        }
                        onKeyDown={onKeyDown}
                        className="h-8 max-w-40 tabular-nums"
                    />
                    {edit.suffix && (
                        <span className="text-muted-foreground text-sm">
                            {edit.suffix}
                        </span>
                    )}
                    {actions}
                </div>
            );
        case 'date':
            return (
                <div className="flex w-full items-center gap-2">
                    <DatePicker
                        aria-label={label}
                        value={(draft as string | null) ?? ''}
                        onChange={(iso) => setDraft(iso)}
                        className="max-w-56"
                    />
                    {actions}
                </div>
            );
        case 'select':
            return (
                <div className="flex w-full items-center gap-2">
                    <Select
                        value={(draft as string | null) ?? NONE}
                        onValueChange={(value) => {
                            const next = value === NONE ? null : value;
                            setDraft(next);
                            save(next);
                        }}
                        disabled={saving}
                    >
                        <SelectTrigger
                            aria-label={label}
                            className="h-8 w-full max-w-64"
                            autoFocus
                        >
                            <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NONE}>Non renseigné</SelectItem>
                            {edit.options.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {saving ? (
                        <Spinner />
                    ) : (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label="Annuler"
                            onClick={cancel}
                        >
                            <X aria-hidden />
                        </Button>
                    )}
                </div>
            );
        case 'multi':
        case 'districts':
            return (
                <div className="grid w-full gap-2" onKeyDown={onKeyDown}>
                    <ChoicePills
                        id={`inline-${slug(label)}`}
                        label={label}
                        multiple
                        options={
                            edit.kind === 'districts'
                                ? districtOptions
                                : edit.options
                        }
                        value={(draft as string[] | number[]).map(String)}
                        onChange={(values) => setDraft(values)}
                    />
                    <div className="flex justify-end">{actions}</div>
                </div>
            );
    }
}

function initial(edit: InlineEdit): InlineValue {
    switch (edit.kind) {
        case 'city':
            return { city: edit.value ?? '', country: edit.country };
        case 'money':
            return edit.value === null ? null : edit.value / 100;
        case 'multi':
            return [...edit.value];
        case 'districts':
            return edit.value.map(String);
        default:
            return edit.value;
    }
}

/** Ce qui part au serveur : centimes pour un montant, nombres pour les quartiers, null pour le vide. */
export function normalize(edit: InlineEdit, value: InlineValue): InlineValue {
    switch (edit.kind) {
        case 'city': {
            const city = (value as CityDraft).city.trim();

            return {
                origin_city: city === '' ? null : city,
                origin_country:
                    city === '' ? null : (value as CityDraft).country,
            };
        }
        case 'money':
            return value === null || value === ''
                ? null
                : Math.round(Number(value) * 100);
        case 'districts':
            return (value as string[]).map(Number).sort((a, b) => a - b);
        case 'multi':
            return [...(value as string[])];
        case 'text':
        case 'textarea':
        case 'date':
            return typeof value === 'string' && value.trim() === ''
                ? null
                : value;
        case 'select':
            return value;
    }
}

function slug(label: string): string {
    return label
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
}
