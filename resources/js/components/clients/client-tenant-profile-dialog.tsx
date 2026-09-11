import { useForm } from '@inertiajs/react';
import { Briefcase, IdCard, Plane, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { FormGrid, FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
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
import { capitalizeName } from '@/lib/format';
import { tenantProfile } from '@/routes/clients';
import type { TenantProfile, TenantSlot } from '@/types';

type Option = { value: string; label: string };

/** Champ étiqueté du formulaire, sur une colonne de la grille. */
function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid content-start gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

/** Bloc du formulaire, au style de référence (sans carte : on est dans un dialogue). */
function Block({
    title,
    icon,
    children,
}: {
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
}) {
    return (
        <FormSection title={title} icon={icon} variant="plain">
            <FormGrid>{children}</FormGrid>
        </FormSection>
    );
}

/**
 * Détails d'un locataire du dossier : état civil, titre de séjour et
 * situation professionnelle. Réservé aux locataires — un garant ou un membre
 * du suivi n'a pas de fiche.
 */
export function ClientTenantProfileDialog({
    clientUuid,
    slot,
    profile,
    residencyStatuses,
    employmentStatuses,
    open,
    onOpenChange,
}: {
    clientUuid: string;
    slot: TenantSlot;
    profile: TenantProfile;
    residencyStatuses: Option[];
    employmentStatuses: Option[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({
        birth_date: profile.birth_date ?? '',
        nationality: profile.nationality ?? '',
        birth_place: profile.birth_place ?? '',
        residency_status: profile.residency_status ?? '',
        residency_number: profile.residency_number ?? '',
        residency_expires_at: profile.residency_expires_at ?? '',
        employment_status: profile.employment_status ?? '',
        employer: profile.employer ?? '',
        income:
            profile.income_cents === null
                ? ''
                : String(profile.income_cents / 100),
    });

    // Chaque ouverture repart des valeurs enregistrées.
    useEffect(() => {
        if (open) {
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Un citoyen de l'UE n'a ni numéro ni date de validité à fournir.
    const needsDocument =
        form.data.residency_status !== '' &&
        form.data.residency_status !== 'ue';

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.patch(tenantProfile({ lead: clientUuid, slot }).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Informations de {profile.name}</DialogTitle>
                    <DialogDescription>
                        {profile.role} · état civil, séjour et situation
                        professionnelle. Tout est facultatif.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-5">
                    <Block title="État civil" icon={IdCard}>
                        <Field
                            id="birth_date"
                            label="Date de naissance"
                            error={form.errors.birth_date}
                        >
                            <Input
                                id="birth_date"
                                type="date"
                                value={form.data.birth_date}
                                onChange={(event) =>
                                    form.setData(
                                        'birth_date',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field
                            id="nationality"
                            label="Nationalité"
                            error={form.errors.nationality}
                        >
                            <Input
                                id="nationality"
                                value={form.data.nationality}
                                onChange={(event) =>
                                    form.setData(
                                        'nationality',
                                        event.target.value,
                                    )
                                }
                                onBlur={(event) =>
                                    form.setData(
                                        'nationality',
                                        capitalizeName(event.target.value),
                                    )
                                }
                                placeholder="Française, Brésilienne…"
                            />
                        </Field>
                        <Field
                            id="birth_place"
                            label="Lieu de naissance"
                            error={form.errors.birth_place}
                        >
                            <Input
                                id="birth_place"
                                value={form.data.birth_place}
                                onChange={(event) =>
                                    form.setData(
                                        'birth_place',
                                        event.target.value,
                                    )
                                }
                                placeholder="Ville, pays"
                            />
                        </Field>
                    </Block>

                    <Block title="Séjour" icon={Plane}>
                        <Field
                            id="residency_status"
                            label="Titre de séjour"
                            error={form.errors.residency_status}
                        >
                            <Select
                                value={form.data.residency_status}
                                onValueChange={(value) =>
                                    form.setData('residency_status', value)
                                }
                            >
                                <SelectTrigger
                                    id="residency_status"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Non renseigné" />
                                </SelectTrigger>
                                <SelectContent>
                                    {residencyStatuses.map((status) => (
                                        <SelectItem
                                            key={status.value}
                                            value={status.value}
                                        >
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        {needsDocument && (
                            <>
                                <Field
                                    id="residency_number"
                                    label="Numéro du titre"
                                    error={form.errors.residency_number}
                                >
                                    <Input
                                        id="residency_number"
                                        value={form.data.residency_number}
                                        onChange={(event) =>
                                            form.setData(
                                                'residency_number',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="residency_expires_at"
                                    label="Valable jusqu’au"
                                    error={form.errors.residency_expires_at}
                                >
                                    <Input
                                        id="residency_expires_at"
                                        type="date"
                                        value={form.data.residency_expires_at}
                                        onChange={(event) =>
                                            form.setData(
                                                'residency_expires_at',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </>
                        )}
                    </Block>

                    <Block title="Situation professionnelle" icon={Briefcase}>
                        <Field
                            id="employment_status"
                            label="Statut"
                            error={form.errors.employment_status}
                        >
                            <Select
                                value={form.data.employment_status}
                                onValueChange={(value) =>
                                    form.setData('employment_status', value)
                                }
                            >
                                <SelectTrigger
                                    id="employment_status"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Non renseigné" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employmentStatuses.map((status) => (
                                        <SelectItem
                                            key={status.value}
                                            value={status.value}
                                        >
                                            {status.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field
                            id="employer"
                            label="Employeur ou école"
                            error={form.errors.employer}
                        >
                            <Input
                                id="employer"
                                value={form.data.employer}
                                onChange={(event) =>
                                    form.setData('employer', event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            id="income"
                            label="Revenu net mensuel (€)"
                            error={form.errors.income}
                        >
                            <Input
                                id="income"
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                className="tabular-nums"
                                value={form.data.income}
                                onChange={(event) =>
                                    form.setData('income', event.target.value)
                                }
                            />
                        </Field>
                    </Block>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
