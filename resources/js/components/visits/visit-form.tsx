import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useCreatedOption } from '@/hooks/use-created-option';
import {
    CalendarClock,
    House,
    Mail,
    MessageSquareText,
    Plus,
} from 'lucide-react';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchSelect } from '@/components/search-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { DatePicker } from '@/components/date-picker';
import {
    VISIO_TIME_SLOTS,
    defaultSlot,
} from '@/components/leads/lead-visio-dialog';
import { FormSection } from '@/components/form-section';
import { PropertyFields } from '@/components/properties/property-fields';
import { PropertyPhotos } from '@/components/properties/property-photos';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { PropertyPicker } from '@/components/visits/property-picker';
import { VisitModeBadge } from '@/components/visits/visit-mode-badge';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
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
import {
    initialPropertyForm,
    propertyFormToPayload,
} from '@/lib/property-form';
import { cn } from '@/lib/utils';
import { parisDayKey } from '@/lib/datetime';
import { visitModeForOffer } from '@/lib/visits';
import { visits as clientsVisits } from '@/routes/clients';
import { show as visitShow, store, update } from '@/routes/clients/visits';
import type {
    PropertyForm,
    PropertyFormOptions,
    Visit,
    VisitClientOption,
    VisitPropertyOption,
} from '@/types';

type Mode = 'existing' | 'new';

type VisitForm = {
    lead_id: string;
    mode: Mode;
    property_id: string;
    property: PropertyForm;
    agent_id: string;
    /** Membre de l'équipe qui réalise la visite. */
    assigned_to: string;
    scheduled_at: string;
    /** Photos du nouveau bien (JPG, PNG ou WebP, 5 Mo, 10 maximum). */
    photos: File[];
    notes: string;
    /** Envoyer la confirmation au client par e-mail (décoché par défaut). */
    notify_client: boolean;
};

export const MAX_PHOTOS = 10;

type Props = {
    clients: VisitClientOption[];
    properties: VisitPropertyOption[];
    options: PropertyFormOptions;
    /** Client présélectionné (ex. depuis un dossier). */
    defaultClientId?: number | null;
    /** Bien de l'annuaire présélectionné (ex. depuis un dossier). */
    defaultPropertyId?: number | null;
    /** Visite à modifier ; absent, le formulaire en planifie une nouvelle. */
    visit?: Visit | null;
};

function initial(
    defaultClientId: number | null,
    hasProperties: boolean,
    assignedTo: number | null,
    defaultPropertyId: number | null = null,
    /** Le client vient (formule « Accompagné ») : la confirmation part par défaut. */
    notifyClient = false,
): VisitForm {
    return {
        lead_id: defaultClientId ? String(defaultClientId) : '',
        mode: hasProperties ? 'existing' : 'new',
        property_id: defaultPropertyId ? String(defaultPropertyId) : '',
        property: initialPropertyForm(),
        agent_id: '',
        assigned_to: assignedTo === null ? '' : String(assignedTo),
        scheduled_at: defaultSlot(),
        photos: [],
        notes: '',
        notify_client: notifyClient,
    };
}

/**
 * Formulaire de la page « Planifier une visite » : client, bien pris dans
 * l'annuaire ou saisi (il rejoint alors « Biens », avec ses photos), date et
 * heure, membre de l'équipe qui réalise la visite, agent, commentaires internes.
 */
export function VisitForm({
    clients,
    properties,
    options,
    defaultClientId = null,
    defaultPropertyId = null,
    visit = null,
}: Props) {
    const editing = visit !== null;
    const { auth, staff } = usePage().props;
    const currentUserId = auth.user?.id ?? null;
    const initials = useInitials();
    const form = useForm<VisitForm>(
        editing
            ? {
                  ...initial(visit.client.id, true, null, visit.property.id),
                  agent_id: visit.agent ? String(visit.agent.id) : '',
                  assigned_to: visit.assignee ? String(visit.assignee.id) : '',
                  // « AAAA-MM-JJTHH:MM » local, comme le sélecteur l'attend.
                  scheduled_at: visit.scheduled_at.slice(0, 16),
                  notes: visit.notes ?? '',
              }
            : initial(
                  defaultClientId,
                  properties.length > 0,
                  currentUserId,
                  defaultPropertyId,
                  clients.find((option) => option.id === defaultClientId)
                      ?.offer === 'accompagne',
              ),
    );
    const errors = form.errors as Record<string, string | undefined>;
    const [agentOpen, setAgentOpen] = useState(false);
    const [agencyOpen, setAgencyOpen] = useState(false);
    // Le dialogue recharge les props sans dire ce qu'il a créé :
    // le nouvel agent est celui qui manquait à la liste d'avant.
    const snapshotAgents = useCreatedOption(options.agents, (id) =>
        form.setData('agent_id', String(id)),
    );
    // Borne basse du créneau : aujourd'hui, ou le jour d'une visite déjà passée.
    const today = parisDayKey(new Date());
    const visitDay =
        visit === null ? null : parisDayKey(new Date(visit.scheduled_at));
    const minDay = visitDay !== null && visitDay < today ? visitDay : today;
    // « AAAA-MM-JJTHH:MM » découpé pour le sélecteur de date et la liste des heures.
    const [datePart = '', timePart = ''] = form.data.scheduled_at.split('T');
    // Erreurs `property.xxx` renvoyées par Laravel, remises sur les champs du bien.
    const propertyErrors = Object.fromEntries(
        Object.entries(errors)
            .filter(([key]) => key.startsWith('property.'))
            .map(([key, message]) => [key.slice('property.'.length), message]),
    ) as Partial<Record<keyof PropertyForm, string | undefined>>;

    // La formule commande la visite : sur « Confié », l'équipe visite sans le
    // client — un membre doit s'en charger et le client n'est pas invité.
    const client = clients.find(
        (option) => String(option.id) === form.data.lead_id,
    );
    const entrusted = client?.offer === 'confie';
    // Le type de visite découle de la formule : le serveur le décide seul.
    const visitMode = visitModeForOffer(client?.offer);

    // Changer de client réaligne la confirmation par e-mail sur sa formule.
    const chooseClient = (value: string) => {
        const chosen = clients.find((option) => String(option.id) === value);

        form.setData({
            ...form.data,
            lead_id: value,
            notify_client: chosen?.offer === 'accompagne',
            // Visite autonome : personne de l'équipe n'y va.
            assigned_to:
                visitModeForOffer(chosen?.offer) === 'client_alone'
                    ? ''
                    : form.data.assigned_to,
        });
    };

    const submit = () => {
        form.transform((data) => {
            const visit = data as VisitForm;

            return {
                lead_id: visit.lead_id === '' ? null : Number(visit.lead_id),
                property_id:
                    visit.mode === 'existing' && visit.property_id !== ''
                        ? Number(visit.property_id)
                        : null,
                property:
                    visit.mode === 'new'
                        ? {
                              ...propertyFormToPayload(visit.property),
                              photos: visit.photos,
                          }
                        : null,
                agent_id: visit.agent_id === '' ? null : Number(visit.agent_id),
                assigned_to:
                    visit.assigned_to === '' ? null : Number(visit.assigned_to),
                scheduled_at: visit.scheduled_at,
                notes: visit.notes,
                notify_client: visit.notify_client,
            };
        });
        if (editing) {
            form.transform((data) => {
                const values = data as VisitForm;

                return {
                    property_id:
                        values.property_id === ''
                            ? null
                            : Number(values.property_id),
                    agent_id:
                        values.agent_id === '' ? null : Number(values.agent_id),
                    assigned_to:
                        values.assigned_to === ''
                            ? null
                            : Number(values.assigned_to),
                    scheduled_at: values.scheduled_at,
                    notes: values.notes,
                    // Une fois modifiée, on revient sur la visite, pas sur la liste.
                    return_to: 'show',
                };
            });
            form.patch(update({ visit: visit.uuid }).url, {
                preserveScroll: true,
            });

            return;
        }

        form.post(store().url, {
            // Des photos peuvent accompagner un bien saisi ici.
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <form
            aria-label={
                editing
                    ? `Modifier la visite de ${visit.client.name}`
                    : 'Planifier une visite'
            }
            className="grid gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <FormSection
                title="Client et créneau"
                hint="Qui visite, quand, et quel membre accompagne."
                icon={CalendarClock}
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="visit-client">Client</Label>
                        <SearchSelect
                            id="visit-client"
                            value={form.data.lead_id}
                            disabled={editing}
                            onChange={chooseClient}
                            placeholder="Choisir un client"
                            searchPlaceholder="Rechercher un client (nom, référence)…"
                            noResults="Aucun client ne correspond."
                            options={clients.map((client) => ({
                                value: String(client.id),
                                label: client.name,
                                hint: client.reference,
                            }))}
                        />
                        <InputError message={errors.lead_id} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="visit-date">Date et heure</Label>
                        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
                            <DatePicker
                                id="visit-date"
                                value={datePart}
                                // Pas de créneau dans le passé : le calendrier
                                // s'ouvre à partir d'aujourd'hui. Une visite
                                // déjà passée garde sa date pour borne, elle
                                // reste modifiable — son compte rendu en dépend.
                                min={minDay}
                                onChange={(iso) =>
                                    form.setData(
                                        'scheduled_at',
                                        `${iso}T${timePart || '10:00'}`,
                                    )
                                }
                            />
                            <Select
                                value={timePart}
                                onValueChange={(value) =>
                                    form.setData(
                                        'scheduled_at',
                                        `${datePart}T${value}`,
                                    )
                                }
                            >
                                <SelectTrigger
                                    aria-label="Heure"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Heure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(VISIO_TIME_SLOTS.includes(timePart)
                                        ? VISIO_TIME_SLOTS
                                        : [timePart, ...VISIO_TIME_SLOTS]
                                    ).map((slot) => (
                                        <SelectItem key={slot} value={slot}>
                                            {slot}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <InputError message={errors.scheduled_at} />
                    </div>
                </div>

                {/* Le type de visite se lit, il ne se choisit pas : la formule
                    souscrite l'a déjà décidé. Bloc entier sous le créneau,
                    plutôt qu'une ligne serrée sous le nom du client. */}
                {client?.offer_label && (
                    <div
                        role="note"
                        className="bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border p-3 text-sm"
                    >
                        <VisitModeBadge mode={visitMode} />
                        <span>
                            <span className="font-medium">
                                Formule {client.offer_label}
                            </span>
                            <span className="text-muted-foreground">
                                {' · '}
                                {entrusted
                                    ? 'l’équipe visite sans le client.'
                                    : 'le client visite lui-même.'}
                            </span>
                        </span>
                    </div>
                )}

                {/* Visite autonome : le client y va seul, personne de
                    l’équipe n’est à désigner. */}
                {visitMode !== 'client_alone' && (
                    <div className="grid gap-2">
                        <Label htmlFor="visit-assigned-to">
                            Visite réalisée par
                        </Label>
                        <SearchSelect
                            id="visit-assigned-to"
                            value={form.data.assigned_to}
                            onChange={(value) =>
                                form.setData('assigned_to', value)
                            }
                            placeholder={
                                entrusted
                                    ? 'Choisir un membre'
                                    : 'Personne pour l’instant'
                            }
                            emptyLabel={
                                entrusted
                                    ? undefined
                                    : 'Personne pour l’instant'
                            }
                            searchPlaceholder="Rechercher un membre…"
                            noResults="Aucun membre ne correspond."
                            options={staff.map((member) => ({
                                value: String(member.id),
                                label:
                                    member.id === currentUserId
                                        ? `${member.name} · moi`
                                        : member.name,
                                hint: member.functions?.join(', ') || null,
                                leading: (
                                    <Avatar className="size-6">
                                        {member.avatar && (
                                            <AvatarImage
                                                src={member.avatar}
                                                alt=""
                                            />
                                        )}
                                        <AvatarFallback className="text-[10px]">
                                            {initials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                ),
                            }))}
                        />
                        <InputError message={errors.assigned_to} />
                    </div>
                )}

                {!entrusted && !editing && (
                    <label
                        htmlFor="visit-notify-client"
                        className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                            form.data.notify_client
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-accent/60',
                        )}
                    >
                        <Checkbox
                            id="visit-notify-client"
                            checked={form.data.notify_client}
                            onCheckedChange={(state) =>
                                form.setData('notify_client', state === true)
                            }
                            className="mt-0.5"
                        />
                        <span className="grid gap-0.5">
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <Mail className="size-4" aria-hidden />
                                Informer le client par e-mail
                            </span>
                            <span className="text-muted-foreground text-xs">
                                Envoie la date, l’adresse du bien et une
                                invitation agenda à l’adresse du client, dans sa
                                langue.
                            </span>
                        </span>
                    </label>
                )}
            </FormSection>

            <FormSection
                title="Bien à visiter"
                hint="Un bien de l’annuaire ou un nouveau bien."
                icon={House}
            >
                <PropertyPicker
                    source={form.data.mode}
                    lockExisting={editing}
                    onSourceChange={(mode) => form.setData('mode', mode)}
                    properties={properties}
                    propertyId={form.data.property_id}
                    onPropertyChange={(id) => form.setData('property_id', id)}
                    error={errors.property_id ?? errors.property}
                />

                {form.data.mode === 'new' && (
                    <div className="grid gap-4 border-t pt-4">
                        <PropertyFields
                            idPrefix="visit-property"
                            values={form.data.property}
                            errors={propertyErrors}
                            options={options}
                            onChange={(property) =>
                                form.setData('property', property)
                            }
                        />

                        {/* Les photos prises en visitant rejoignent la fiche du
                            bien : c'est le moment où on les a sous la main. */}
                        <div className="grid gap-2">
                            <Label>
                                Photos du bien{' '}
                                <span className="text-muted-foreground font-normal">
                                    (facultatif)
                                </span>
                            </Label>
                            <PropertyPhotos
                                saved={[]}
                                files={form.data.photos}
                                onSavedChange={() => undefined}
                                onFilesChange={(photos) =>
                                    form.setData('photos', photos)
                                }
                                disabled={form.processing}
                            />
                            <InputError
                                message={
                                    errors['property.photos'] ??
                                    errors['property.photos.0']
                                }
                            />
                        </div>
                    </div>
                )}
            </FormSection>

            <FormSection
                title="Agent et commentaires"
                hint="Agent immobilier présent et consignes internes."
                icon={MessageSquareText}
            >
                <div className="grid gap-2">
                    <Label htmlFor="visit-agent">Agent immobilier</Label>
                    <SearchSelect
                        id="visit-agent"
                        value={form.data.agent_id}
                        onChange={(value) => form.setData('agent_id', value)}
                        placeholder="Agent du bien, sinon aucun"
                        emptyLabel="Agent du bien, sinon aucun"
                        searchPlaceholder="Rechercher un agent (nom, agence)…"
                        noResults="Aucun agent ne correspond."
                        options={options.agents.map((agent) => ({
                            value: String(agent.id),
                            label: agent.name,
                            hint: agent.agency,
                        }))}
                    />
                    {/* L'agent rencontré n'est pas toujours dans l'annuaire :
                        il s'ajoute ici, sans perdre la visite en cours de saisie. */}
                    <div className="flex flex-wrap items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs [&_svg]:size-3.5"
                            onClick={() => {
                                snapshotAgents();
                                setAgentOpen(true);
                            }}
                        >
                            <Plus aria-hidden />
                            Nouvel agent
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs [&_svg]:size-3.5"
                            onClick={() => setAgencyOpen(true)}
                        >
                            <Plus aria-hidden />
                            Nouvelle agence
                        </Button>
                    </div>
                    <InputError message={errors.agent_id} />
                </div>

                {/* Créés sans quitter le formulaire : l'agent qui vient
                    d'apparaître dans la liste est aussitôt sélectionné. */}
                <AgentDialog
                    open={agentOpen}
                    onOpenChange={setAgentOpen}
                    agencies={options.agencies}
                />
                <AgencyDialog open={agencyOpen} onOpenChange={setAgencyOpen} />

                <div className="grid gap-2">
                    <Label htmlFor="visit-notes">Commentaires internes</Label>
                    <Textarea
                        id="visit-notes"
                        rows={2}
                        value={form.data.notes}
                        onChange={(event) =>
                            form.setData('notes', event.target.value)
                        }
                        placeholder="Point de rendez-vous, code, consignes… Visible par l’équipe seulement."
                    />
                    <InputError message={errors.notes} />
                </div>
            </FormSection>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="ghost" asChild>
                    <Link
                        href={
                            editing
                                ? visitShow({ visit: visit.uuid })
                                : clientsVisits()
                        }
                    >
                        Annuler
                    </Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner />}
                    {editing ? 'Enregistrer' : 'Planifier la visite'}
                </Button>
            </div>
        </form>
    );
}
