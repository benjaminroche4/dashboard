import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type AddressValues = {
    street: string;
    postal_code: string;
    city: string;
};

/**
 * Adresse (rue, code postal, ville) avec suggestions Google Places sur la rue
 * quand la clé est configurée : choisir une suggestion remplit les trois champs.
 * `trailing` ajoute un champ au bout de la ligne « code postal · ville »
 * (l'arrondissement, sur le formulaire d'un bien).
 */
export function AddressFields({
    idPrefix,
    values,
    errors,
    onChange,
    trailing,
}: {
    idPrefix: string;
    values: AddressValues;
    errors: Partial<Record<keyof AddressValues, string | undefined>>;
    onChange: (values: AddressValues) => void;
    trailing?: ReactNode;
}) {
    const { features } = usePage().props;

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-street`}>Adresse</Label>
                <AddressAutocomplete
                    id={`${idPrefix}-street`}
                    enabled={features.addressAutocomplete}
                    regionCodes={['fr']}
                    value={values.street}
                    onChange={(street) => onChange({ ...values, street })}
                    onSelect={(address) =>
                        onChange({
                            street: address.street,
                            postal_code: address.postalCode,
                            city: address.city,
                        })
                    }
                    placeholder="12 rue de Turenne"
                />
                <InputError message={errors.street} />
            </div>
            <div
                className={cn(
                    'grid grid-cols-1 gap-4',
                    trailing === undefined
                        ? 'sm:grid-cols-[8rem_1fr]'
                        : 'sm:grid-cols-[8rem_1fr_9rem]',
                )}
            >
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-postal_code`}>
                        Code postal
                    </Label>
                    <Input
                        id={`${idPrefix}-postal_code`}
                        value={values.postal_code}
                        onChange={(event) =>
                            onChange({
                                ...values,
                                postal_code: event.target.value,
                            })
                        }
                        autoComplete="off"
                        placeholder="75003"
                    />
                    <InputError message={errors.postal_code} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-city`}>Ville</Label>
                    <Input
                        id={`${idPrefix}-city`}
                        value={values.city}
                        onChange={(event) =>
                            onChange({ ...values, city: event.target.value })
                        }
                        autoComplete="off"
                        placeholder="Paris"
                    />
                    <InputError message={errors.city} />
                </div>
                {trailing}
            </div>
        </>
    );
}
