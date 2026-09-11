import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
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
import { Textarea } from '@/components/ui/textarea';
import { capitalizeName } from '@/lib/format';
import guarantors from '@/routes/clients/guarantors';
import type { ClientGuarantor } from '@/types';

/**
 * Ajout ou modification d'un garant : ses informations, rien de plus (aucune
 * pièce à fournir ici).
 */
export function GuarantorDialog({
    clientUuid,
    guarantor,
    open,
    onOpenChange,
}: {
    clientUuid: string;
    /** Garant à modifier ; `null` pour un ajout. */
    guarantor: ClientGuarantor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const editing = guarantor !== null;
    const form = useForm({
        first_name: guarantor?.first_name ?? '',
        last_name: guarantor?.last_name ?? '',
        email: guarantor?.email ?? '',
        phone: guarantor?.phone ?? '',
        income:
            guarantor?.income_cents == null
                ? ''
                : String(guarantor.income_cents / 100),
        note: guarantor?.note ?? '',
    });

    const submit = () => {
        form.transform((data) => {
            const values = data as Record<string, string>;
            const { income, ...rest } = values;

            return {
                ...rest,
                income_cents:
                    income === '' ? null : Math.round(Number(income) * 100),
            };
        });

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (editing) {
            form.patch(
                guarantors.update({
                    lead: clientUuid,
                    guarantor: guarantor.uuid,
                }).url,
                options,
            );

            return;
        }

        form.post(guarantors.store({ lead: clientUuid }).url, options);
    };

    const remove = () => {
        if (!editing) return;

        form.delete(
            guarantors.destroy({
                lead: clientUuid,
                guarantor: guarantor.uuid,
            }).url,
            { preserveScroll: true, onSuccess: () => onOpenChange(false) },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editing ? 'Modifier le garant' : 'Ajouter un garant'}
                    </DialogTitle>
                    <DialogDescription>
                        Ses informations de contact et son revenu mensuel net.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="guarantor-first-name">Prénom</Label>
                            <Input
                                id="guarantor-first-name"
                                value={form.data.first_name}
                                onChange={(event) =>
                                    form.setData(
                                        'first_name',
                                        event.target.value,
                                    )
                                }
                                onBlur={() =>
                                    form.setData(
                                        'first_name',
                                        capitalizeName(form.data.first_name),
                                    )
                                }
                            />
                            <InputError message={form.errors.first_name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="guarantor-last-name">Nom</Label>
                            <Input
                                id="guarantor-last-name"
                                value={form.data.last_name}
                                onChange={(event) =>
                                    form.setData(
                                        'last_name',
                                        event.target.value,
                                    )
                                }
                                onBlur={() =>
                                    form.setData(
                                        'last_name',
                                        capitalizeName(form.data.last_name),
                                    )
                                }
                            />
                            <InputError message={form.errors.last_name} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="guarantor-email">E-mail</Label>
                        <Input
                            id="guarantor-email"
                            type="email"
                            value={form.data.email}
                            onChange={(event) =>
                                form.setData('email', event.target.value)
                            }
                        />
                        <InputError message={form.errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="guarantor-phone">Téléphone</Label>
                        <PhoneInput
                            id="guarantor-phone"
                            name="guarantor_phone_national"
                            value={form.data.phone}
                            onChange={(value) => form.setData('phone', value)}
                        />
                        <InputError message={form.errors.phone} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="guarantor-income">
                            Revenu mensuel net
                        </Label>
                        <Input
                            id="guarantor-income"
                            type="number"
                            min={0}
                            step={100}
                            inputMode="numeric"
                            placeholder="Ex. 4 500"
                            value={form.data.income}
                            onChange={(event) =>
                                form.setData('income', event.target.value)
                            }
                        />
                        <InputError
                            message={
                                (
                                    form.errors as Record<
                                        string,
                                        string | undefined
                                    >
                                ).income_cents
                            }
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="guarantor-note">Note</Label>
                        <Textarea
                            id="guarantor-note"
                            rows={2}
                            value={form.data.note}
                            onChange={(event) =>
                                form.setData('note', event.target.value)
                            }
                            placeholder="Lien avec le client, situation…"
                        />
                        <InputError message={form.errors.note} />
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    {editing ? (
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={remove}
                        >
                            Retirer du dossier
                        </Button>
                    ) : (
                        <span />
                    )}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={form.processing}
                        >
                            Enregistrer
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
