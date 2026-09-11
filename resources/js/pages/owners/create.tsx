import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    ChevronDown,
    ChevronUp,
    FileText,
    Home,
    Megaphone,
    Sofa,
    TriangleAlert,
    UserRound,
    Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { CountryFlag } from '@/components/country-flag';
import { FormActionBar } from '@/components/form-action-bar';
import { ChoicePills } from '@/components/leads/condition-choices';
import { propertyAmenityIcons } from '@/lib/property-amenity-icons';
import {
    FormField as Field,
    FormGroup as Group,
    FormStepper,
} from '@/components/leads/lead-form-shell';
import { LeadClosingGuide } from '@/components/leads/lead-closing-guide';
import { PhoneInput } from '@/components/phone-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useInitials } from '@/hooks/use-initials';
import {
    emptyOwnerLeadForm,
    ownerLeadErrorFields,
    ownerLeadFormToPayload,
    ownerLeadToForm,
    validateOwnerLeadForm,
    type OwnerLeadFormErrors,
} from '@/lib/owner-lead-form';
import { ownerClosingGuide } from '@/lib/owner-closing-guide';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { duplicates as leadDuplicates, show as leadShow } from '@/routes/leads';
import { leads as ownersLeads } from '@/routes/owners';
import {
    store as ownerLeadStore,
    update as ownerLeadUpdate,
} from '@/routes/owners/leads';
import type {
    LabeledOption,
    LeadLanguage,
    LeadSource,
    LeaseType,
    Orientation,
    OwnerLeadEditable,
    OwnerLeadForm,
    OwnerPropertyType,
    PropertyAmenity,
    PropertyFurnishing,
    PropertyStatus,
} from '@/types';

type Props = {
    languages: LabeledOption<LeadLanguage>[];
    sources: LabeledOption<LeadSource>[];
    propertyTypes: LabeledOption<OwnerPropertyType>[];
    propertyStatuses: LabeledOption<PropertyStatus>[];
    leaseTypes: LabeledOption<LeaseType>[];
    orientations: LabeledOption<Orientation>[];
    amenities: LabeledOption<PropertyAmenity>[];
    furnishingOptions: LabeledOption<PropertyFurnishing>[];
    /** Présent en mode modification. */
    lead?: OwnerLeadEditable;
};

type Duplicate = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    status_label: string;
    url: string;
};

const steps = [
    {
        number: 1,
        title: 'Coordonnées',
        description: 'Un e-mail ou un téléphone suffit pour commencer.',
    },
    {
        number: 2,
        title: 'Détail du bien',
        description: 'Le logement que le propriétaire confie. Facultatif.',
    },
    {
        number: 3,
        title: 'Conditions de location',
        description: 'Bail, loyer et équipements. Facultatif.',
    },
] as const;

type StepNumber = (typeof steps)[number]['number'];

/** Clés d'erreur rattachées à chaque étape, pour valider et naviguer. */
const stepFields: Record<StepNumber, string[]> = {
    1: [
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'language',
        'source',
        'source_note',
        'assigned_to',
    ],
    2: [
        'property.address',
        'property.place_id',
        'property.property_type',
        'property.property_status',
        'property.bedrooms',
        'property.bathrooms',
        'property.surface',
        'property.floor',
        'property.building_floors',
        'property.furnishing',
        'property.orientations',
    ],
    3: [
        'property.lease_types',
        'property.rent_cents',
        'property.charges_cents',
        'property.deposit_cents',
        'property.amenities',
        'property.note',
    ],
};

function stepOf(errorKey: string): StepNumber {
    return (
        (Object.keys(stepFields).map(Number) as StepNumber[]).find((number) =>
            stepFields[number].includes(errorKey),
        ) ?? 1
    );
}

const bedroomOptions: LabeledOption<string>[] = [
    ...[0, 1, 2, 3, 4].map((count) => ({
        value: String(count),
        label: String(count),
    })),
    { value: '5', label: '5+' },
];
const bathroomOptions: LabeledOption<string>[] = [
    ...[1, 2, 3].map((count) => ({
        value: String(count),
        label: String(count),
    })),
    { value: '4', label: '4+' },
];

/** Équipements affichés avant « Voir plus ». */
const VISIBLE_AMENITIES = 12;

/** Champ numérique avec une unité à droite (m², €). */
function UnitInput({
    id,
    value,
    onChange,
    unit,
    error,
    min,
    placeholder,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    unit: string;
    error?: string;
    min?: number;
    placeholder?: string;
}) {
    return (
        <div className="relative">
            <Input
                id={id}
                name={id}
                type="number"
                inputMode="numeric"
                min={min}
                step={1}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                className="bg-background pr-12"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <span
                aria-hidden
                className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
            >
                {unit}
            </span>
        </div>
    );
}

/**
 * Converting Machine propriétaire : le formulaire « Proposer un bien » du site,
 * saisi par l'équipe. Aussi utilisé pour modifier un lead propriétaire.
 */
export default function OwnerLeadCreate({
    languages,
    sources,
    propertyTypes,
    propertyStatuses,
    leaseTypes,
    orientations,
    amenities,
    furnishingOptions,
    lead,
}: Props) {
    const editing = lead !== undefined;
    const { auth, staff, features } = usePage().props;
    const form = useForm<OwnerLeadForm>(
        lead
            ? ownerLeadToForm(lead)
            : emptyOwnerLeadForm({
                  source: sources[0]?.value ?? 'website',
                  assignedTo: auth.user?.id ?? null,
              }),
    );
    // Erreurs détectées localement avant l'envoi ; celles du serveur priment.
    const [localErrors, setLocalErrors] = useState<OwnerLeadFormErrors>({});
    const errors: Record<string, string | undefined> = {
        ...localErrors,
        ...(form.errors as Record<string, string>),
    };
    const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
    const [allAmenities, setAllAmenities] = useState(() =>
        (lead?.property?.amenities ?? []).some(
            (amenity) =>
                amenities.findIndex((option) => option.value === amenity) >=
                VISIBLE_AMENITIES,
        ),
    );
    const getInitials = useInitials();
    const formRef = useRef<HTMLFormElement>(null);
    const [step, setStep] = useState<StepNumber>(1);
    const [visited, setVisited] = useState<Set<number>>(
        () => new Set(editing ? [1, 2, 3] : [1]),
    );
    // ⌘/Ctrl+Entrée ou « Enregistrer » : on valide tout, quel que soit l'écran.
    const submitAllRef = useRef(false);

    const goTo = (target: StepNumber) => {
        if (target > step) {
            const found = Object.fromEntries(
                Object.entries(validateOwnerLeadForm(form.data)).filter(
                    ([key]) => stepFields[step].includes(key),
                ),
            );
            setLocalErrors(found);

            if (Object.keys(found).length > 0) {
                notify.error(
                    'Étape incomplète',
                    'Corrigez les champs signalés avant de continuer.',
                );

                return;
            }
        }

        setLocalErrors({});
        setStep(target);
        setVisited((state) => new Set([...state, target]));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const requestSubmitAll = () => {
        submitAllRef.current = true;
        formRef.current?.requestSubmit();
    };
    const errorKeys = Object.keys(errors).join('|');

    // Le premier champ en erreur reçoit le focus, qu'elle vienne du serveur ou du local.
    useEffect(() => {
        const first = errorKeys.split('|')[0];

        if (!first) {
            return;
        }

        const element = document.getElementById(
            ownerLeadErrorFields[first] ?? first,
        );

        if (element instanceof HTMLElement) {
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });
            element.focus({ preventScroll: true });
        }
    }, [errorKeys]);

    // Doublons : dès qu'un e-mail complet ou un téléphone est saisi.
    useEffect(() => {
        const email = form.data.email.trim();
        const digits = form.data.phone.replace(/\D/g, '');

        if (!email.includes('@') && digits.length < 6) {
            setDuplicates([]);

            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(
                leadDuplicates({
                    query: {
                        email: email.includes('@') ? email : '',
                        phone: digits.length >= 6 ? form.data.phone : '',
                        except: lead?.id ?? '',
                    },
                }).url,
                {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((response) => (response.ok ? response.json() : []))
                .then((hits: Duplicate[]) => setDuplicates(hits))
                .catch(() => undefined);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [form.data.email, form.data.phone, lead?.id]);

    // Raccourcis : ⌘/Ctrl+Entrée enregistre, Échap annule (hors menus ouverts).
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submitAllRef.current = true;
                formRef.current?.requestSubmit();
            }

            if (
                event.key === 'Escape' &&
                !event.defaultPrevented &&
                document.querySelector(
                    '[data-radix-popper-content-wrapper]',
                ) === null
            ) {
                router.visit(
                    lead
                        ? leadShow({ lead: lead.uuid }).url
                        : ownersLeads().url,
                );
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [lead]);

    const set =
        <K extends keyof OwnerLeadForm>(key: K) =>
        (value: OwnerLeadForm[K]) =>
            form.setData((data) => ({ ...data, [key]: value }));
    const setProperty =
        <K extends keyof OwnerLeadForm['property']>(key: K) =>
        (value: OwnerLeadForm['property'][K]) =>
            form.setData((data) => ({
                ...data,
                property: { ...data.property, [key]: value },
            }));

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const all = submitAllRef.current;
        submitAllRef.current = false;

        // Entrée dans un champ des étapes 1 et 2 : on avance, on n'envoie pas.
        if (!all && !editing && step < 3) {
            goTo((step + 1) as StepNumber);

            return;
        }

        const found = validateOwnerLeadForm(form.data);
        setLocalErrors(found);
        const firstError = Object.keys(found)[0];

        if (firstError) {
            const target = stepOf(firstError);

            if (target !== step) {
                setStep(target);
                setVisited((state) => new Set([...state, target]));
            }

            notify.error(
                'Formulaire incomplet',
                'Corrigez les champs signalés avant de continuer.',
            );

            return;
        }

        form.transform((data) => ownerLeadFormToPayload(data));

        if (lead) {
            form.put(ownerLeadUpdate({ lead: lead.uuid }).url);
        } else {
            form.post(ownerLeadStore().url);
        }
    };

    const cancelHref = lead ? leadShow({ lead: lead.uuid }) : ownersLeads();
    const { property } = form.data;
    const hiddenAmenities = amenities.length - VISIBLE_AMENITIES;
    const shownAmenities = allAmenities
        ? amenities
        : amenities.slice(0, VISIBLE_AMENITIES);

    return (
        <>
            <Head
                title={editing ? `Modifier ${lead.name}` : 'Converting Machine'}
            />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4">
                <div className="grid gap-6 pt-8 pb-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {editing
                                    ? `Modifier ${lead.name}`
                                    : 'Converting Machine'}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {editing
                                    ? 'Le statut et la place dans le kanban ne changent pas.'
                                    : 'Lead propriétaire : le même formulaire que « Proposer un bien » sur le site. Le contact suffit pour commencer.'}
                            </p>
                        </div>
                        <LeadClosingGuide
                            guide={ownerClosingGuide}
                            storageKey={
                                editing ? `owner:${lead.id}` : 'owner:new'
                            }
                            language={form.data.language}
                        />
                    </div>
                    <FormStepper
                        steps={steps}
                        current={step}
                        visited={visited}
                        onSelect={goTo}
                    />
                </div>

                <form
                    ref={formRef}
                    id="owner-lead-form"
                    onSubmit={submit}
                    noValidate
                    className="grid gap-5 pb-8"
                    data-test="owner-lead-form"
                >
                    {step === 1 && (
                        <>
                            <Group
                                title="Coordonnées"
                                hint="Un e-mail ou un téléphone suffit pour commencer."
                                icon={UserRound}
                            >
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field
                                        label="Prénom"
                                        htmlFor="first_name"
                                        error={errors.first_name}
                                    >
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            aria-invalid={Boolean(
                                                errors.first_name,
                                            )}
                                            autoFocus
                                            autoComplete="off"
                                            className="bg-background"
                                            value={form.data.first_name}
                                            onChange={(e) =>
                                                set('first_name')(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Nom"
                                        htmlFor="last_name"
                                        error={errors.last_name}
                                    >
                                        <Input
                                            id="last_name"
                                            name="last_name"
                                            aria-invalid={Boolean(
                                                errors.last_name,
                                            )}
                                            autoComplete="off"
                                            className="bg-background"
                                            value={form.data.last_name}
                                            onChange={(e) =>
                                                set('last_name')(e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="E-mail"
                                        htmlFor="email"
                                        error={errors.email}
                                    >
                                        <Input
                                            id="email"
                                            name="email"
                                            aria-invalid={Boolean(errors.email)}
                                            type="email"
                                            autoComplete="off"
                                            placeholder="john@doe.com"
                                            className="bg-background"
                                            value={form.data.email}
                                            onChange={(e) =>
                                                set('email')(e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Téléphone"
                                        htmlFor="phone"
                                        error={errors.phone}
                                    >
                                        <PhoneInput
                                            id="phone"
                                            value={form.data.phone}
                                            onChange={set('phone')}
                                        />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto]">
                                    <Field
                                        label="Société"
                                        htmlFor="company"
                                        error={errors.company}
                                    >
                                        <Input
                                            id="company"
                                            name="company"
                                            autoComplete="off"
                                            placeholder="Facultatif"
                                            className="bg-background"
                                            value={form.data.company}
                                            onChange={(e) =>
                                                set('company')(e.target.value)
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Langue"
                                        error={errors.language}
                                    >
                                        <ToggleGroup
                                            type="single"
                                            variant="outline"
                                            value={form.data.language}
                                            onValueChange={(value) => {
                                                if (value) {
                                                    set('language')(
                                                        value as LeadLanguage,
                                                    );
                                                }
                                            }}
                                            aria-label="Langue"
                                            className="justify-start"
                                        >
                                            {languages.map((language) => (
                                                <ToggleGroupItem
                                                    key={language.value}
                                                    value={language.value}
                                                    className="bg-background px-3"
                                                >
                                                    <CountryFlag
                                                        code={
                                                            language.value ===
                                                            'en'
                                                                ? 'GB'
                                                                : 'FR'
                                                        }
                                                        className="size-3.5"
                                                    />
                                                    {language.label}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </Field>
                                </div>
                                {duplicates.length > 0 && (
                                    <Alert
                                        variant="warning"
                                        data-test="duplicates"
                                    >
                                        <TriangleAlert aria-hidden />
                                        <AlertTitle>
                                            {duplicates.length > 1
                                                ? 'Des leads existent déjà avec ce contact'
                                                : 'Un lead existe déjà avec ce contact'}
                                        </AlertTitle>
                                        <AlertDescription>
                                            <ul
                                                role="list"
                                                className="grid gap-1"
                                            >
                                                {duplicates.map((duplicate) => (
                                                    <li
                                                        key={duplicate.id}
                                                        className="flex flex-wrap items-center gap-x-2"
                                                    >
                                                        <Link
                                                            href={duplicate.url}
                                                            className="font-medium underline-offset-4 hover:underline"
                                                        >
                                                            {duplicate.name}
                                                        </Link>
                                                        <span className="text-xs opacity-80">
                                                            {[
                                                                duplicate.email,
                                                                duplicate.phone,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                            {' · '}
                                                            {
                                                                duplicate.status_label
                                                            }
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="mt-1">
                                                Ouvrez la fiche existante plutôt
                                                que d'en créer une seconde.
                                            </p>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </Group>

                            <Group title="Source" icon={Megaphone}>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field
                                        label="Source du lead"
                                        htmlFor="source"
                                        error={errors.source}
                                    >
                                        <Select
                                            value={form.data.source}
                                            onValueChange={(value) =>
                                                set('source')(
                                                    value as LeadSource,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="source"
                                                aria-label="Source"
                                                className="bg-background w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sources.map((source) => (
                                                    <SelectItem
                                                        key={source.value}
                                                        value={source.value}
                                                    >
                                                        {source.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field
                                        label="Précision"
                                        htmlFor="source_note"
                                        error={errors.source_note}
                                    >
                                        <Input
                                            id="source_note"
                                            name="source_note"
                                            autoComplete="off"
                                            placeholder="Recommandé par…, campagne…"
                                            className="bg-background"
                                            value={form.data.source_note}
                                            onChange={(e) =>
                                                set('source_note')(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                                <Field
                                    label="Suivi par"
                                    error={errors.assigned_to}
                                >
                                    <div
                                        id="assigned_to"
                                        tabIndex={-1}
                                        role="radiogroup"
                                        aria-label="Suivi par"
                                        className="flex flex-wrap gap-2"
                                    >
                                        {[
                                            {
                                                id: null,
                                                name: "Personne pour l'instant",
                                                avatar: null,
                                            },
                                            ...staff,
                                        ].map((member) => {
                                            const checked =
                                                form.data.assigned_to ===
                                                member.id;
                                            const label =
                                                member.id !== null &&
                                                member.id === auth.user?.id
                                                    ? `${member.name} (moi)`
                                                    : member.name;

                                            return (
                                                <button
                                                    key={member.id ?? 'none'}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={checked}
                                                    aria-label={label}
                                                    onClick={() =>
                                                        set('assigned_to')(
                                                            member.id,
                                                        )
                                                    }
                                                    className={cn(
                                                        'bg-background flex h-9 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors',
                                                        checked
                                                            ? 'border-primary bg-primary/5'
                                                            : 'hover:bg-sidebar-accent',
                                                    )}
                                                >
                                                    <Avatar className="size-7">
                                                        {member.id !== null && (
                                                            <AvatarImage
                                                                src={
                                                                    member.avatar ??
                                                                    undefined
                                                                }
                                                                alt=""
                                                            />
                                                        )}
                                                        <AvatarFallback className="text-[10px]">
                                                            {member.id ===
                                                            null ? (
                                                                <UserRound className="size-3.5" />
                                                            ) : (
                                                                getInitials(
                                                                    member.name,
                                                                )
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                            </Group>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Group
                                title="Détail du bien"
                                hint="Adresse, type et configuration du logement."
                                icon={Home}
                            >
                                <Field
                                    label="Adresse du bien"
                                    htmlFor="property_address"
                                    error={errors['property.address']}
                                    hint={
                                        features.addressAutocomplete
                                            ? 'Choisissez une suggestion pour une adresse complète.'
                                            : undefined
                                    }
                                >
                                    <AddressAutocomplete
                                        id="property_address"
                                        value={property.address}
                                        enabled={features.addressAutocomplete}
                                        regionCodes={['fr']}
                                        placeholder="12 rue de Rivoli, Paris"
                                        className="bg-background"
                                        onChange={(value) => {
                                            setProperty('address')(value);
                                            setProperty('place_id')('');
                                        }}
                                        onSelect={(address) =>
                                            setProperty('address')(
                                                [
                                                    address.street,
                                                    [
                                                        address.postalCode,
                                                        address.city,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' '),
                                                ]
                                                    .filter(Boolean)
                                                    .join(', '),
                                            )
                                        }
                                    />
                                </Field>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field
                                        label="Type de bien"
                                        htmlFor="property_type"
                                        error={errors['property.property_type']}
                                    >
                                        <ChoicePills
                                            id="property_type"
                                            label="Type de bien"
                                            options={propertyTypes}
                                            value={property.property_type}
                                            onChange={(value) =>
                                                setProperty('property_type')(
                                                    value as
                                                        | OwnerPropertyType
                                                        | '',
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Statut du bien"
                                        htmlFor="property_status"
                                        error={
                                            errors['property.property_status']
                                        }
                                    >
                                        <ChoicePills
                                            id="property_status"
                                            label="Statut du bien"
                                            options={propertyStatuses}
                                            value={property.property_status}
                                            onChange={(value) =>
                                                setProperty('property_status')(
                                                    value as
                                                        | PropertyStatus
                                                        | '',
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Chambres"
                                        htmlFor="bedrooms"
                                        error={errors['property.bedrooms']}
                                    >
                                        <ChoicePills
                                            id="bedrooms"
                                            label="Chambres"
                                            options={bedroomOptions}
                                            value={
                                                property.bedrooms === null
                                                    ? ''
                                                    : String(property.bedrooms)
                                            }
                                            onChange={(value) =>
                                                setProperty('bedrooms')(
                                                    value === ''
                                                        ? null
                                                        : Number(value),
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Salles de bain"
                                        htmlFor="bathrooms"
                                        error={errors['property.bathrooms']}
                                    >
                                        <ChoicePills
                                            id="bathrooms"
                                            label="Salles de bain"
                                            options={bathroomOptions}
                                            value={
                                                property.bathrooms === null
                                                    ? ''
                                                    : String(property.bathrooms)
                                            }
                                            onChange={(value) =>
                                                setProperty('bathrooms')(
                                                    value === ''
                                                        ? null
                                                        : Number(value),
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <Field
                                        label="Surface"
                                        htmlFor="surface"
                                        error={errors['property.surface']}
                                    >
                                        <UnitInput
                                            id="surface"
                                            unit="m²"
                                            min={0}
                                            placeholder="30"
                                            value={property.surface}
                                            onChange={setProperty('surface')}
                                            error={errors['property.surface']}
                                        />
                                    </Field>
                                    <Field
                                        label="Étage du bien"
                                        htmlFor="floor"
                                        error={errors['property.floor']}
                                    >
                                        <Input
                                            id="floor"
                                            name="floor"
                                            type="number"
                                            inputMode="numeric"
                                            min={-5}
                                            max={99}
                                            step={1}
                                            placeholder="1"
                                            aria-invalid={Boolean(
                                                errors['property.floor'],
                                            )}
                                            className="bg-background"
                                            value={property.floor}
                                            onChange={(e) =>
                                                setProperty('floor')(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Étages de l'immeuble"
                                        htmlFor="building_floors"
                                        error={
                                            errors['property.building_floors']
                                        }
                                    >
                                        <Input
                                            id="building_floors"
                                            name="building_floors"
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={99}
                                            step={1}
                                            placeholder="6"
                                            aria-invalid={Boolean(
                                                errors[
                                                    'property.building_floors'
                                                ],
                                            )}
                                            className="bg-background"
                                            value={property.building_floors}
                                            onChange={(e) =>
                                                setProperty('building_floors')(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                            </Group>

                            <Group
                                title="Aménagement"
                                hint="Meublé ou vide, et l'exposition du logement."
                                icon={Sofa}
                            >
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <Field
                                        label="Meublé"
                                        htmlFor="furnishing"
                                        error={errors['property.furnishing']}
                                    >
                                        <ChoicePills
                                            id="furnishing"
                                            label="Meublé"
                                            options={furnishingOptions}
                                            value={property.furnishing}
                                            onChange={(value) =>
                                                setProperty('furnishing')(
                                                    value as
                                                        | PropertyFurnishing
                                                        | '',
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Orientation"
                                        htmlFor="orientations"
                                        error={errors['property.orientations']}
                                    >
                                        <ChoicePills
                                            multiple
                                            id="orientations"
                                            label="Orientation"
                                            options={orientations}
                                            value={property.orientations}
                                            onChange={(value) =>
                                                setProperty('orientations')(
                                                    value as Orientation[],
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                            </Group>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Group
                                title="Conditions de location"
                                hint="Le type de bail envisagé et les montants mensuels."
                                icon={Wallet}
                            >
                                <Field
                                    label="Type de bail"
                                    htmlFor="lease_types"
                                    error={errors['property.lease_types']}
                                >
                                    <ChoicePills
                                        multiple
                                        id="lease_types"
                                        label="Type de bail"
                                        options={leaseTypes}
                                        value={property.lease_types}
                                        onChange={(value) =>
                                            setProperty('lease_types')(
                                                value as LeaseType[],
                                            )
                                        }
                                    />
                                </Field>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <Field
                                        label="Loyer hors charges"
                                        htmlFor="rent"
                                        error={errors['property.rent_cents']}
                                        hint="Par mois"
                                    >
                                        <UnitInput
                                            id="rent"
                                            unit="€"
                                            min={0}
                                            value={property.rent}
                                            onChange={setProperty('rent')}
                                            error={
                                                errors['property.rent_cents']
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Charges"
                                        htmlFor="charges"
                                        error={errors['property.charges_cents']}
                                        hint="Par mois"
                                    >
                                        <UnitInput
                                            id="charges"
                                            unit="€"
                                            min={0}
                                            value={property.charges}
                                            onChange={setProperty('charges')}
                                            error={
                                                errors['property.charges_cents']
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Dépôt de garantie"
                                        htmlFor="deposit"
                                        error={errors['property.deposit_cents']}
                                    >
                                        <UnitInput
                                            id="deposit"
                                            unit="€"
                                            min={0}
                                            value={property.deposit}
                                            onChange={setProperty('deposit')}
                                            error={
                                                errors['property.deposit_cents']
                                            }
                                        />
                                    </Field>
                                </div>
                            </Group>

                            <Group
                                title="Équipements"
                                hint="Ce que le logement offre."
                                icon={Building2}
                            >
                                <Field
                                    label="Équipements"
                                    htmlFor="amenities"
                                    error={errors['property.amenities']}
                                >
                                    <ChoicePills
                                        multiple
                                        id="amenities"
                                        label="Équipements"
                                        icons={propertyAmenityIcons}
                                        options={shownAmenities}
                                        value={property.amenities}
                                        onChange={(value) =>
                                            setProperty('amenities')(
                                                value as PropertyAmenity[],
                                            )
                                        }
                                    />
                                </Field>
                                {hiddenAmenities > 0 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="justify-self-start"
                                        aria-expanded={allAmenities}
                                        onClick={() =>
                                            setAllAmenities((open) => !open)
                                        }
                                    >
                                        {allAmenities ? (
                                            <>
                                                <ChevronUp aria-hidden />
                                                Voir moins
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown aria-hidden />
                                                Voir plus (+{hiddenAmenities})
                                            </>
                                        )}
                                    </Button>
                                )}
                            </Group>

                            <Group
                                title="Précisions"
                                hint="Tout ce qui aidera à placer ce bien."
                                icon={FileText}
                            >
                                <Field
                                    label="Note libre"
                                    htmlFor="property_note"
                                    error={errors['property.note']}
                                >
                                    <Textarea
                                        id="property_note"
                                        name="property_note"
                                        rows={4}
                                        placeholder="Précisions sur le bien, contraintes, disponibilités pour une visite…"
                                        aria-invalid={Boolean(
                                            errors['property.note'],
                                        )}
                                        className="bg-background"
                                        value={property.note}
                                        onChange={(e) =>
                                            setProperty('note')(e.target.value)
                                        }
                                    />
                                </Field>
                            </Group>
                        </>
                    )}
                </form>
            </div>
            <FormActionBar innerClassName="max-w-4xl">
                {step > 1 && (
                    <Button
                        type="button"
                        variant="ghost"
                        className="mr-auto"
                        onClick={() => goTo((step - 1) as StepNumber)}
                    >
                        <ArrowLeft />
                        Précédent
                    </Button>
                )}
                <Button type="button" variant="ghost" asChild>
                    <Link href={cancelHref}>Annuler</Link>
                </Button>
                {!editing && step === 2 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => goTo(3)}
                    >
                        Passer
                    </Button>
                )}
                {!editing && step === 3 && (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing}
                        onClick={requestSubmitAll}
                    >
                        Passer et enregistrer
                    </Button>
                )}
                {!editing && step < 3 && (
                    <Button
                        type="button"
                        onClick={() => goTo((step + 1) as StepNumber)}
                    >
                        Continuer
                        <ArrowRight />
                    </Button>
                )}
                {editing && step < 3 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => goTo((step + 1) as StepNumber)}
                    >
                        Étape suivante
                        <ArrowRight />
                    </Button>
                )}
                {(editing || step === 3) && (
                    <Button
                        type="button"
                        disabled={form.processing}
                        onClick={requestSubmitAll}
                    >
                        {form.processing && <Spinner />}
                        {editing ? 'Enregistrer' : 'Ajouter le lead'}
                    </Button>
                )}
            </FormActionBar>
        </>
    );
}

OwnerLeadCreate.layout = {
    breadcrumbs: [
        { title: 'Propriétaires', href: ownersLeads() },
        { title: 'Converting Machine', href: '#' },
    ],
};
