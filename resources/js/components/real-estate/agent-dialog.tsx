import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { AddressFields } from '@/components/real-estate/address-fields';
import { AgencyCombobox } from '@/components/real-estate/agency-combobox';
import { ContactDuplicatesAlert } from '@/components/real-estate/contact-duplicates-alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { agentPositions } from '@/lib/agent-positions';
import { capitalizeName } from '@/lib/format';
import { useContactDuplicates } from '@/hooks/use-contact-duplicates';
import { duplicates as agentDuplicates, store, update } from '@/routes/agents';
import type { AgencyOption, Agent, AgentForm } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agencies: AgencyOption[];
    /** Agent à modifier ; absent pour un ajout. */
    agent?: Agent | null;
    /** Agence présélectionnée pour un ajout (depuis la page Agences). */
    defaultAgencyId?: number | null;
};

function initial(
    agent: Agent | null | undefined,
    defaultAgencyId: number | null,
): AgentForm {
    return {
        agency_id: agent?.agency
            ? String(agent.agency.id)
            : defaultAgencyId
              ? String(defaultAgencyId)
              : '',
        first_name: agent?.first_name ?? '',
        last_name: agent?.last_name ?? '',
        position: agent?.position_value ?? '',
        street: agent?.street ?? '',
        postal_code: agent?.postal_code ?? '',
        city: agent?.city ?? '',
        email: agent?.email ?? '',
        phone: agent?.phone ?? '',
        notes: agent?.notes ?? '',
        notify: false,
    };
}

/** Ajout ou modification d'un agent immobilier. */
export function AgentDialog({
    open,
    onOpenChange,
    agencies,
    agent = null,
    defaultAgencyId = null,
}: Props) {
    const form = useForm<AgentForm>(initial(agent, defaultAgencyId));
    const editing = agent !== null;
    const duplicates = useContactDuplicates(
        (query) => agentDuplicates({ query }).url,
        form.data.email,
        form.data.phone,
        agent?.id ?? '',
        open,
    );

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(agent, defaultAgencyId));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, agent, defaultAgencyId]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (agent) {
            form.patch(update({ agent: agent.uuid }).url, options);
        } else {
            form.post(store().url, options);
        }
    };

    const field = (
        key: Exclude<
            keyof AgentForm,
            | 'agency_id'
            | 'notes'
            | 'street'
            | 'postal_code'
            | 'city'
            | 'position'
            | 'notify'
        >,
        label: string,
        props: { type?: string; placeholder?: string; required?: boolean } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`agent-${key}`}>{label}</Label>
            <Input
                id={`agent-${key}`}
                value={form.data[key]}
                onChange={(event) => form.setData(key, event.target.value)}
                onBlur={
                    key === 'first_name' || key === 'last_name'
                        ? (event) =>
                              form.setData(
                                  key,
                                  capitalizeName(event.target.value),
                              )
                        : undefined
                }
                autoComplete="off"
                {...props}
            />
            <InputError message={form.errors[key]} />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editing ? `Modifier ${agent.name}` : 'Nouvel agent'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Coordonnées et agence de rattachement.'
                            : 'Prénom et nom sont obligatoires. Un agent sans agence est indépendant.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field('first_name', 'Prénom', { required: true })}
                        {field('last_name', 'Nom', { required: true })}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="agent-agency">Agence</Label>
                        <AgencyCombobox
                            id="agent-agency"
                            value={form.data.agency_id}
                            onChange={(value) =>
                                form.setData('agency_id', value)
                            }
                            agencies={agencies}
                        />
                        <InputError message={form.errors.agency_id} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="agent-position">Fonction</Label>
                        <Select
                            value={form.data.position}
                            onValueChange={(value) =>
                                form.setData('position', value)
                            }
                        >
                            <SelectTrigger
                                id="agent-position"
                                className="w-full"
                            >
                                <SelectValue placeholder="Choisir une fonction" />
                            </SelectTrigger>
                            <SelectContent>
                                {agentPositions.map((position) => (
                                    <SelectItem
                                        key={position.value}
                                        value={position.value}
                                    >
                                        {position.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.position} />
                    </div>
                    <AddressFields
                        idPrefix="agent"
                        values={{
                            street: form.data.street,
                            postal_code: form.data.postal_code,
                            city: form.data.city,
                        }}
                        errors={form.errors}
                        onChange={(address) =>
                            form.setData({ ...form.data, ...address })
                        }
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="agent-phone">Téléphone</Label>
                            <PhoneInput
                                id="agent-phone"
                                value={form.data.phone}
                                onChange={(value) =>
                                    form.setData('phone', value)
                                }
                            />
                            <InputError message={form.errors.phone} />
                        </div>
                        {field('email', 'E-mail', {
                            type: 'email',
                            placeholder: 'prenom@agence.fr',
                        })}
                    </div>
                    <ContactDuplicatesAlert
                        duplicates={duplicates}
                        noun="agent"
                    />
                    <div className="grid gap-2">
                        <Label htmlFor="agent-notes">Notes</Label>
                        <Textarea
                            id="agent-notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            placeholder="Réactivité, quartiers, historique…"
                        />
                        <InputError message={form.errors.notes} />
                    </div>
                    {!editing && (
                        <label
                            htmlFor="agent-notify"
                            className="bg-sidebar flex items-start gap-3 rounded-lg border p-3 text-sm"
                        >
                            <Checkbox
                                id="agent-notify"
                                checked={
                                    form.data.notify &&
                                    form.data.email.trim() !== ''
                                }
                                disabled={form.data.email.trim() === ''}
                                onCheckedChange={(state) =>
                                    form.setData('notify', state === true)
                                }
                                className="mt-0.5"
                            />
                            <span className="grid gap-0.5">
                                <span className="font-medium">
                                    Prévenir l’agent par e-mail
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {form.data.email.trim() === ''
                                        ? 'Renseignez un e-mail pour envoyer le message de bienvenue.'
                                        : 'Un message de bienvenue lui indique qu’il rejoint notre annuaire, avec votre contact en réponse.'}
                                </span>
                            </span>
                        </label>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {editing ? 'Enregistrer' : 'Ajouter l’agent'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
