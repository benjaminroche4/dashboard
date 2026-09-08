import { useForm, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    House,
    ImagePlus,
    Mail,
    MessageSquareText,
    X,
} from 'lucide-react';
import { useRef } from 'react';
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
import { PropertyFields } from '@/components/properties/property-fields';
import { PropertyPicker } from '@/components/visits/property-picker';
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
import { visits as clientsVisits } from '@/routes/clients';
import { store } from '@/routes/clients/visits';
import type {
    PropertyForm,
    PropertyFormOptions,
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
};

function initial(
    defaultClientId: number | null,
    hasProperties: boolean,
    assignedTo: number | null,
    defaultPropertyId: number | null = null,
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
        notify_client: false,
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
}: Props) {
    const { auth, staff } = usePage().props;
    const currentUserId = auth.user?.id ?? null;
    const initials = useInitials();
    const form = useForm<VisitForm>(
        initial(
            defaultClientId,
            properties.length > 0,
            currentUserId,
            defaultPropertyId,
        ),
    );
    const photoInput = useRef<HTMLInputElement>(null);
    const errors = form.errors as Record<string, string | undefined>;
    // « AAAA-MM-JJTHH:MM » découpé pour le sélecteur de date et la liste des heures.
    const [datePart = '', timePart = ''] = form.data.scheduled_at.split('T');
    // Erreurs `property.xxx` renvoyées par Laravel, remises sur les champs du bien.
    const propertyErrors = Object.fromEntries(
        Object.entries(errors)
            .filter(([key]) => key.startsWith('property.'))
            .map(([key, message]) => [key.slice('property.'.length), message]),
    ) as Partial<Record<keyof PropertyForm, string | undefined>>;

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
        form.post(store().url, {
            preserveScroll: true,
            forceFormData:
                form.data.mode === 'new' && form.data.photos.length > 0,
        });
    };

    const addPhotos = (files: FileList | null) => {
        if (!files) {
            return;
        }

        form.setData(
            'photos',
            [...form.data.photos, ...Array.from(files)].slice(0, MAX_PHOTOS),
        );
    };

    const removePhoto = (index: number) =>
        form.setData(
            'photos',
            form.data.photos.filter((_, position) => position !== index),
        );

    const photoError = Object.entries(errors).find(([key]) =>
        key.startsWith('property.photos'),
    )?.[1];

    return (
        <form
            aria-label="Planifier une visite"
            className="grid gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <div className="bg-background grid gap-4 rounded-lg border p-4">
                <div className="flex items-start gap-3 border-b pb-3">
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <CalendarClock className="size-4" aria-hidden />
                    </span>
                    <div className="grid gap-0.5">
                        <h2 className="text-sm font-medium">
                            Client et créneau
                        </h2>
                        <p className="text-muted-foreground text-xs">
                            Qui visite, quand, et quel membre accompagne.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="visit-client">Client</Label>
                        <SearchSelect
                            id="visit-client"
                            value={form.data.lead_id}
                            onChange={(value) => form.setData('lead_id', value)}
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

                <div className="grid gap-2">
                    <Label htmlFor="visit-assigned-to">Visite assignée à</Label>
                    <SearchSelect
                        id="visit-assigned-to"
                        value={form.data.assigned_to}
                        onChange={(value) => form.setData('assigned_to', value)}
                        placeholder="Personne pour l’instant"
                        emptyLabel="Personne pour l’instant"
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
                            Envoie la date, l’adresse du bien et une invitation
                            agenda à l’adresse du client, dans sa langue.
                        </span>
                    </span>
                </label>
            </div>

            <div className="bg-background grid gap-4 rounded-lg border p-4">
                <div className="flex items-start gap-3 border-b pb-3">
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <House className="size-4" aria-hidden />
                    </span>
                    <div className="grid gap-0.5">
                        <h2 className="text-sm font-medium">Bien à visiter</h2>
                        <p className="text-muted-foreground text-xs">
                            Un bien de l’annuaire ou un nouveau bien.
                        </p>
                    </div>
                </div>
                <PropertyPicker
                    source={form.data.mode}
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
                        <div className="border-foreground/10 grid gap-2 border-t pt-5">
                            <Label htmlFor="visit-photos">Photos</Label>
                            <input
                                ref={photoInput}
                                id="visit-photos"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="sr-only"
                                onChange={(event) => {
                                    addPhotos(event.target.files);
                                    event.target.value = '';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => photoInput.current?.click()}
                                disabled={form.data.photos.length >= MAX_PHOTOS}
                                className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm transition-colors disabled:opacity-50"
                            >
                                <ImagePlus className="size-4" aria-hidden />
                                Ajouter des photos (JPG, PNG ou WebP, 5 Mo max,{' '}
                                {MAX_PHOTOS} au plus)
                            </button>
                            {form.data.photos.length > 0 && (
                                <ul
                                    aria-label="Photos à envoyer"
                                    className="grid gap-1 text-sm"
                                >
                                    {form.data.photos.map((photo, index) => (
                                        <li
                                            key={`${photo.name}-${index}`}
                                            className="bg-sidebar flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                                        >
                                            <span className="truncate">
                                                {photo.name}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-7"
                                                aria-label={`Retirer ${photo.name}`}
                                                onClick={() =>
                                                    removePhoto(index)
                                                }
                                            >
                                                <X aria-hidden />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <InputError message={photoError} />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-background grid gap-4 rounded-lg border p-4">
                <div className="flex items-start gap-3 border-b pb-3">
                    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <MessageSquareText className="size-4" aria-hidden />
                    </span>
                    <div className="grid gap-0.5">
                        <h2 className="text-sm font-medium">
                            Agent et commentaires
                        </h2>
                        <p className="text-muted-foreground text-xs">
                            Agent immobilier présent et consignes internes.
                        </p>
                    </div>
                </div>
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
                    <InputError message={errors.agent_id} />
                </div>

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
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="ghost" asChild>
                    <Link href={clientsVisits()}>Annuler</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner />}
                    Planifier la visite
                </Button>
            </div>
        </form>
    );
}
