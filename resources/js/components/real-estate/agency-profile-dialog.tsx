import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { ChoicePills } from '@/components/leads/condition-choices';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    districtOptions,
    initialProfileForm,
    profileFormToPayload,
} from '@/lib/agency-profile';
import type { AgencyProfile, AgencyProfileForm, ProfileOptions } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Agence : tout le profil. Agent : quartiers, spécialités, langues seulement. */
    scope: 'agency' | 'agent';
    name: string;
    profile: Partial<AgencyProfile> | null | undefined;
    options: ProfileOptions;
    /** Route PATCH `agencies.profile` ou `agents.profile`. */
    url: string;
};

const triStates: { value: '' | '1' | '0'; label: string }[] = [
    { value: '', label: 'On ne sait pas' },
    { value: '1', label: 'Oui' },
    { value: '0', label: 'Non' },
];

/**
 * Profil de matching d'une agence ou d'un agent : ce qu'on renseigne après
 * coup, à la main, pour que le matching sache à qui confier quel client.
 * Rien n'est obligatoire — un profil vide reste un profil.
 */
export function AgencyProfileDialog({
    open,
    onOpenChange,
    scope,
    name,
    profile,
    options,
    url,
}: Props) {
    const form = useForm<AgencyProfileForm>(initialProfileForm(profile));
    // Les erreurs serveur portent les clés envoyées (loyers en centimes), pas celles du formulaire.
    const serverErrors = form.errors as Record<string, string | undefined>;

    useEffect(() => {
        if (open) {
            form.setData(initialProfileForm(profile));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, profile]);

    const submit = () => {
        form.transform((data) => profileFormToPayload(data));
        form.patch(url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const numbers = (values: string[]) => values.map(Number);
    const strings = (values: number[]) => values.map(String);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Profil de {name}</DialogTitle>
                    <DialogDescription>
                        {scope === 'agency'
                            ? 'Ce que l’agence sait faire, pour que le matching lui confie les bons clients. Tout est facultatif.'
                            : 'Ce que cet agent couvre en propre ; vide, le profil de son agence sert. Tout est facultatif.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="profile-districts">
                            Quartiers couverts
                        </Label>
                        <ChoicePills
                            id="profile-districts"
                            label="Quartiers couverts"
                            multiple
                            options={districtOptions}
                            value={strings(form.data.districts)}
                            onChange={(values) =>
                                form.setData('districts', numbers(values))
                            }
                        />
                        <InputError message={form.errors.districts} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="profile-specialties">Spécialités</Label>
                        <ChoicePills
                            id="profile-specialties"
                            label="Spécialités"
                            multiple
                            options={options.specialties}
                            value={form.data.specialties}
                            onChange={(values) =>
                                form.setData('specialties', values)
                            }
                        />
                        <InputError message={form.errors.specialties} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="profile-languages">
                            Langues parlées (hors français)
                        </Label>
                        <ChoicePills
                            id="profile-languages"
                            label="Langues parlées"
                            multiple
                            options={options.languages}
                            value={form.data.languages}
                            onChange={(values) =>
                                form.setData('languages', values)
                            }
                        />
                        <InputError message={form.errors.languages} />
                    </div>
                    {scope === 'agency' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="profile-mandates">
                                    Mandats
                                </Label>
                                <ChoicePills
                                    id="profile-mandates"
                                    label="Mandats"
                                    multiple
                                    options={options.mandateTypes}
                                    value={form.data.mandate_types}
                                    onChange={(values) =>
                                        form.setData('mandate_types', values)
                                    }
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="profile-rent-min">
                                        Loyer minimum (€ / mois)
                                    </Label>
                                    <Input
                                        id="profile-rent-min"
                                        inputMode="decimal"
                                        value={form.data.rent_min}
                                        onChange={(event) =>
                                            form.setData(
                                                'rent_min',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={serverErrors.rent_min_cents}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="profile-rent-max">
                                        Loyer maximum (€ / mois)
                                    </Label>
                                    <Input
                                        id="profile-rent-max"
                                        inputMode="decimal"
                                        value={form.data.rent_max}
                                        onChange={(event) =>
                                            form.setData(
                                                'rent_max',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={serverErrors.rent_max_cents}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="profile-fees">
                                    Frais d’agence pour le locataire
                                </Label>
                                <Input
                                    id="profile-fees"
                                    placeholder="Ex. 12 €/m², ou un mois de loyer"
                                    value={form.data.fee_note}
                                    onChange={(event) =>
                                        form.setData(
                                            'fee_note',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.fee_note} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {(
                                    [
                                        [
                                            'accepts_garantme',
                                            'Accepte Garantme',
                                        ],
                                        [
                                            'accepts_foreign_files',
                                            'Accepte les dossiers étrangers',
                                        ],
                                    ] as const
                                ).map(([key, label]) => (
                                    <div key={key} className="grid gap-2">
                                        <Label htmlFor={`profile-${key}`}>
                                            {label}
                                        </Label>
                                        <Select
                                            value={form.data[key]}
                                            onValueChange={(value) =>
                                                form.setData(
                                                    key,
                                                    value as '' | '1' | '0',
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id={`profile-${key}`}
                                                className="w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {triStates.map((state) => (
                                                    <SelectItem
                                                        key={
                                                            state.value ||
                                                            'unknown'
                                                        }
                                                        value={state.value}
                                                    >
                                                        {state.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Enregistrer le profil
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
