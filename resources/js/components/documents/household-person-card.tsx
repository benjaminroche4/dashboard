import { Trash2 } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { categoryIcon } from '@/lib/document-category-icons';
import {
    countInCategory,
    isCategoryChecked,
    personName,
    toggleCategory,
    toggleDocument,
} from '@/lib/document-request-form';
import { cn } from '@/lib/utils';
import type { CatalogGroup, HouseholdPersonForm, HouseholdRole } from '@/types';

export type HouseholdPersonErrors = {
    first_name?: string;
    last_name?: string;
    documents?: string;
};

type Props = {
    index: number;
    /** Nombre de personnes du foyer, pour « Personne 2 sur 3 ». */
    total?: number;
    person: HouseholdPersonForm;
    catalog: CatalogGroup[];
    roles: { value: HouseholdRole; label: string }[];
    /** Erreurs serveur ou locales de cette personne. */
    errors?: HouseholdPersonErrors;
    /** Absent quand la personne est la seule du foyer. */
    onRemove?: () => void;
    onChange: (person: HouseholdPersonForm) => void;
};

/**
 * Éditeur d'une personne du foyer : prénom et nom, rôle (locataire ou garant)
 * puis pièces à cocher, groupées par catégorie avec un bouton « Tous »
 * (« Décocher » quand tout est coché).
 */
export function HouseholdPersonCard({
    index,
    total,
    person,
    catalog,
    roles,
    errors = {},
    onRemove,
    onChange,
}: Props) {
    const id = `person-${index}`;
    const name = personName(person, index);
    const named = name !== `Personne ${index + 1}`;

    return (
        <section
            aria-label={`Personne ${index + 1}`}
            id={id}
            className="bg-sidebar rounded-xl border"
        >
            <header className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
                <div className="grid gap-0.5">
                    {named && (
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            Personne {index + 1}
                            {total !== undefined && total > 1
                                ? ` sur ${total}`
                                : ''}
                        </p>
                    )}
                    <h3 className="text-base font-medium">{name}</h3>
                </div>
                {onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        aria-label={`Retirer la personne ${index + 1}`}
                    >
                        <Trash2 />
                        Retirer
                    </Button>
                )}
            </header>

            <div className="grid divide-y px-4 pb-4 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor={`${id}-first_name`}>
                            Prénom <span className="text-red-600">*</span>
                        </Label>
                        <Input
                            id={`${id}-first_name`}
                            value={person.first_name}
                            onChange={(event) =>
                                onChange({
                                    ...person,
                                    first_name: event.target.value,
                                })
                            }
                            autoComplete="off"
                            className="bg-background"
                        />
                        <InputError message={errors.first_name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${id}-last_name`}>
                            Nom <span className="text-red-600">*</span>
                        </Label>
                        <Input
                            id={`${id}-last_name`}
                            value={person.last_name}
                            onChange={(event) =>
                                onChange({
                                    ...person,
                                    last_name: event.target.value,
                                })
                            }
                            autoComplete="off"
                            className="bg-background"
                        />
                        <InputError message={errors.last_name} />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>
                        Rôle <span className="text-red-600">*</span>
                    </Label>
                    <RadioGroup
                        aria-label={`Rôle de la personne ${index + 1}`}
                        value={person.role}
                        onValueChange={(value) =>
                            onChange({
                                ...person,
                                role: value as HouseholdRole,
                            })
                        }
                        className="flex flex-wrap gap-3"
                    >
                        {roles.map((role) => (
                            <Label
                                key={role.value}
                                htmlFor={`${id}-role-${role.value}`}
                                className="bg-background has-data-[state=checked]:border-primary has-data-[state=checked]:ring-primary/20 hover:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal transition-colors has-data-[state=checked]:ring-2"
                            >
                                <RadioGroupItem
                                    id={`${id}-role-${role.value}`}
                                    value={role.value}
                                />
                                {role.label}
                            </Label>
                        ))}
                    </RadioGroup>
                </div>

                <div className="grid gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                        <Label>
                            Pièces demandées{' '}
                            <span className="text-red-600">*</span>
                        </Label>
                        <span className="text-muted-foreground text-xs tabular-nums">
                            {person.documents.length} cochée(s)
                        </span>
                    </div>
                    <InputError message={errors.documents} />

                    <div className="grid gap-4">
                        {catalog.map((group) => {
                            const checked = isCategoryChecked(person, group);
                            const count = countInCategory(person, group);
                            const Icon = categoryIcon(group.value);

                            return (
                                <fieldset
                                    key={group.value}
                                    className="bg-background rounded-lg border"
                                >
                                    <legend className="sr-only">
                                        {group.label}
                                    </legend>
                                    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <Icon
                                                aria-hidden="true"
                                                className="text-muted-foreground size-4 shrink-0"
                                            />
                                            {group.label}
                                            {count > 0 && (
                                                <span className="text-muted-foreground text-xs font-normal tabular-nums">
                                                    {count}/{group.items.length}
                                                </span>
                                            )}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            aria-pressed={checked}
                                            aria-label={`${checked ? 'Décocher' : 'Tout cocher'} ${group.label} pour la personne ${index + 1}`}
                                            onClick={() =>
                                                onChange(
                                                    toggleCategory(
                                                        person,
                                                        group,
                                                    ),
                                                )
                                            }
                                        >
                                            {checked ? 'Décocher' : 'Tous'}
                                        </Button>
                                    </div>
                                    {/* auto-rows-fr : toutes les pièces de la catégorie ont la même hauteur, avec ou sans aide. */}
                                    <ul className="grid auto-rows-fr grid-cols-1 gap-0.5 p-2 sm:grid-cols-2">
                                        {group.items.map((item) => {
                                            const itemId = `${id}-${item.key}`;
                                            const isChecked =
                                                person.documents.includes(
                                                    item.key,
                                                );

                                            return (
                                                <li key={item.key}>
                                                    <Label
                                                        htmlFor={itemId}
                                                        className={cn(
                                                            'hover:bg-accent/40 flex h-full cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 font-normal transition-colors',
                                                            isChecked &&
                                                                'bg-accent/60',
                                                        )}
                                                    >
                                                        <Checkbox
                                                            id={itemId}
                                                            checked={isChecked}
                                                            onCheckedChange={(
                                                                value,
                                                            ) =>
                                                                onChange(
                                                                    toggleDocument(
                                                                        person,
                                                                        item.key,
                                                                        value ===
                                                                            true,
                                                                    ),
                                                                )
                                                            }
                                                            className="mt-0.5"
                                                        />
                                                        <span className="grid gap-0.5">
                                                            <span className="text-sm leading-tight">
                                                                {item.label}
                                                            </span>
                                                            {item.hint && (
                                                                <span className="text-muted-foreground text-xs leading-snug">
                                                                    {item.hint}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </Label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </fieldset>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
