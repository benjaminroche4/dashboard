import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useInitials } from '@/hooks/use-initials';
import {
    ArrowLeft,
    ArrowRight,
    CalendarClock,
    ClipboardList,
    MapPin,
    Megaphone,
    Package,
    Star,
    TriangleAlert,
    UserRound,
    Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { FormActionBar } from '@/components/form-action-bar';
import { Panel } from '@/components/panel';
import { ConditionChoices } from '@/components/leads/condition-choices';
import {
    FormField,
    FormGroup,
    FormStepper,
} from '@/components/leads/lead-form-shell';
import { LeadClosingGuide } from '@/components/leads/lead-closing-guide';
import { DistrictMap } from '@/components/leads/district-map';
import { PhoneInput } from '@/components/phone-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatMoney } from '@/lib/format';
import { toCents } from '@/lib/invoice-totals';
import {
    leadErrorFields,
    validateLeadForm,
    type LeadFormErrors,
} from '@/lib/lead-validation';
import { TIGHT_BUDGET_CENTS, isTightBudget } from '@/lib/paris-budget';
import { daysUntil, isUrgentArrival } from '@/lib/lead-urgency';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
    duplicates as leadDuplicates,
    index as leadsIndex,
    show as leadShow,
    store,
    update,
} from '@/routes/leads';
import type {
    Currency,
    Furnished,
    GuarantorType,
    LabeledOption,
    LeadDuration,
    LeadEditable,
    LeadForm,
    LeadLanguage,
    LeadOfferOption,
    LeadSegment,
    LeadSource,
    OfferValue,
    PropertyType,
    RecontactChannel,
} from '@/types';

type Props = {
    offers: LeadOfferOption[];
    sources: LabeledOption<LeadSource>[];
    defaultCurrency: Currency;
    languages: LabeledOption<LeadLanguage>[];
    propertyTypes: LabeledOption<PropertyType>[];
    durations: LabeledOption<LeadDuration>[];
    guarantors: LabeledOption<GuarantorType>[];
    furnishedOptions: LabeledOption<Furnished>[];
    recontactChannels: LabeledOption<RecontactChannel>[];
    /** Présent en mode modification. */
    lead?: LeadEditable;
    /** Liste de destination à la création (`?segment=owner` depuis le menu Propriétaires). */
    segment?: LeadSegment;
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
        title: 'Contact',
        description: 'Un e-mail ou un téléphone suffit pour commencer.',
    },
    {
        number: 2,
        title: 'Projet logement',
        description: 'Ce que le prospect cherche à Paris. Facultatif.',
    },
    {
        number: 3,
        title: 'Qualité du lead',
        description: 'Votre évaluation et la suite à donner. Facultatif.',
    },
] as const;

type StepNumber = (typeof steps)[number]['number'];

/** Lecture partagée de la note : un mot vaut mieux qu'un chiffre. */
export const scoreLabels: Record<number, string> = {
    1: 'Curieux',
    2: 'Tiède',
    3: 'Sérieux',
    4: 'Chaud',
    5: 'Prêt à signer',
};

/** Clés d'erreur rattachées à chaque étape, pour valider et naviguer. */
const stepFields: Record<StepNumber, string[]> = {
    1: [
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'language',
        'offer',
        'source',
        'source_note',
    ],
    2: [
        'budget_cents',
        'arrival_at',
        'districts',
        'duration',
        'guarantors',
        'furnished',
        'origin_city',
        'message',
    ],
    3: [
        'score',
        'recontact_channel',
        'recontact_at',
        'assigned_to',
        'qualification_note',
    ],
};

function stepOf(errorKey: string): StepNumber {
    return (
        (Object.keys(stepFields).map(Number) as StepNumber[]).find((number) =>
            stepFields[number].includes(errorKey),
        ) ?? 1
    );
}

/** Étapes, groupes et champs partagés avec la Converting Machine propriétaire. */
const Stepper = (
    props: Omit<
        React.ComponentProps<typeof FormStepper<(typeof steps)[number]>>,
        'steps'
    >,
) => <FormStepper steps={steps} {...props} />;
const Group = FormGroup;
const Field = FormField;

/** Ne garde que les champs du formulaire (sans id ni nom composé). */
function toForm(lead: LeadEditable): LeadForm {
    const { id: _id, name: _name, ...form } = lead;

    return form;
}

/**
 * Converting Machine : le formulaire de qualification d'un prospect,
 * aussi utilisé pour modifier un lead existant.
 */
export default function LeadsCreate({
    offers,
    sources,
    defaultCurrency,
    languages,
    durations,
    guarantors,
    furnishedOptions,
    recontactChannels,
    lead,
    segment = 'tenant',
}: Props) {
    const editing = lead !== undefined;
    const owner = (lead?.segment ?? segment) === 'owner';
    const { auth, staff } = usePage().props;
    const form = useForm<LeadForm>(
        lead
            ? { ...toForm(lead) }
            : {
                  first_name: '',
                  last_name: '',
                  email: '',
                  phone: '',
                  company: '',
                  language: 'fr',
                  offer: '',
                  source: sources[0]?.value ?? 'website',
                  source_note: '',
                  budget: '',
                  currency: defaultCurrency,
                  arrival_at: '',
                  origin_city: '',
                  districts: [],
                  property_types: [],
                  duration: '',
                  guarantors: [],
                  furnished: '',
                  message: '',
                  score: null,
                  recontact_channel: '',
                  recontact_at: '',
                  qualification_note: '',
                  assigned_to: auth.user?.id ?? null,
                  segment,
              },
    );
    // Erreurs détectées localement avant l'envoi ; celles du serveur priment.
    const [localErrors, setLocalErrors] = useState<LeadFormErrors>({});
    const errors: Record<string, string | undefined> = {
        ...localErrors,
        ...(form.errors as Record<string, string>),
    };
    const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
    const [hoveredScore, setHoveredScore] = useState<number | null>(null);
    const shownScore = hoveredScore ?? form.data.score;
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
                Object.entries(validateLeadForm(form.data)).filter(([key]) =>
                    stepFields[step].includes(key),
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
            leadErrorFields[first] ?? first,
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
                    lead ? leadShow({ lead: lead.uuid }).url : leadsIndex().url,
                );
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [lead]);
    const set =
        <K extends keyof LeadForm>(key: K) =>
        (value: LeadForm[K]) =>
            form.setData((data) => ({ ...data, [key]: value }));
    const tightBudget = isTightBudget(toCents(form.data.budget));
    const urgentArrival = isUrgentArrival(form.data.arrival_at);
    const arrivalInDays = urgentArrival ? daysUntil(form.data.arrival_at) : 0;
    const submit = (event: FormEvent) => {
        event.preventDefault();

        const all = submitAllRef.current;
        submitAllRef.current = false;

        // Entrée dans un champ des étapes 1 et 2 : on avance, on n'envoie pas.
        if (!all && !editing && step < 3) {
            goTo((step + 1) as StepNumber);

            return;
        }

        const found = validateLeadForm(form.data);
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

        form.transform((data) => ({
            ...data,
            offer: data.offer === '' ? null : data.offer,
            arrival_at: data.arrival_at === '' ? null : data.arrival_at,
            recontact_at: data.recontact_at === '' ? null : data.recontact_at,
            duration: data.duration === '' ? null : data.duration,
            furnished: data.furnished === '' ? null : data.furnished,
            recontact_channel:
                data.recontact_channel === '' ? null : data.recontact_channel,
            budget_cents:
                data.budget.trim() === '' ? null : toCents(data.budget),
        }));

        if (lead) {
            form.put(update({ lead: lead.uuid }).url);
        } else {
            form.post(store().url);
        }
    };

    const cancelHref = lead ? leadShow({ lead: lead.uuid }) : leadsIndex();

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
                                    : owner
                                      ? 'Lead propriétaire : il rejoindra la liste « Leads propriétaires ». Le contact suffit pour commencer.'
                                      : 'Le contact suffit pour créer le lead. Le projet et la qualification peuvent attendre.'}
                            </p>
                        </div>
                        <LeadClosingGuide
                            storageKey={editing ? String(lead.id) : 'new'}
                            language={form.data.language}
                        />
                    </div>
                    <Stepper current={step} visited={visited} onSelect={goTo} />
                </div>

                {/* Même enveloppe que « Planifier une visite » et « Nouveau bien » :
                    un panneau nommé qui porte les cartes du formulaire. */}
                <Panel
                    title={owner ? 'Lead propriétaire' : 'Lead locataire'}
                    className="mb-8"
                >
                    <form
                        ref={formRef}
                        id="lead-form"
                        onSubmit={submit}
                        noValidate
                        className="grid gap-5"
                        data-test="lead-form"
                    >
                        {step === 1 && (
                            <>
                                <Group
                                    title="Contact"
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
                                                    set('last_name')(
                                                        e.target.value,
                                                    )
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
                                                aria-invalid={Boolean(
                                                    errors.email,
                                                )}
                                                type="email"
                                                autoComplete="off"
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
                                                    set('company')(
                                                        e.target.value,
                                                    )
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
                                                    {duplicates.map(
                                                        (duplicate) => (
                                                            <li
                                                                key={
                                                                    duplicate.id
                                                                }
                                                                className="flex flex-wrap items-center gap-x-2"
                                                            >
                                                                <Link
                                                                    href={
                                                                        duplicate.url
                                                                    }
                                                                    className="font-medium underline-offset-4 hover:underline"
                                                                >
                                                                    {
                                                                        duplicate.name
                                                                    }
                                                                </Link>
                                                                <span className="text-xs opacity-80">
                                                                    {[
                                                                        duplicate.email,
                                                                        duplicate.phone,
                                                                    ]
                                                                        .filter(
                                                                            Boolean,
                                                                        )
                                                                        .join(
                                                                            ' · ',
                                                                        )}
                                                                    {' · '}
                                                                    {
                                                                        duplicate.status_label
                                                                    }
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                                <p className="mt-1">
                                                    Ouvrez la fiche existante
                                                    plutôt que d'en créer une
                                                    seconde.
                                                </p>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </Group>

                                <Group
                                    title="Formule"
                                    hint="Celle que le prospect envisage. Modifiable plus tard."
                                    icon={Package}
                                >
                                    <RadioGroup
                                        value={form.data.offer}
                                        onValueChange={(value) =>
                                            set('offer')(value as OfferValue)
                                        }
                                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                                    >
                                        {offers.map((offer) => (
                                            <Label
                                                key={offer.value}
                                                htmlFor={`offer-${offer.value}`}
                                                className="bg-background has-data-[state=checked]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal"
                                            >
                                                <RadioGroupItem
                                                    id={`offer-${offer.value}`}
                                                    value={offer.value}
                                                    aria-label={offer.label}
                                                    className="mt-0.5"
                                                />
                                                <span className="grid min-w-0 flex-1 gap-1">
                                                    <span className="flex items-center justify-between gap-2 font-medium">
                                                        {offer.label}
                                                        <span className="text-foreground text-sm font-semibold tabular-nums">
                                                            {formatMoney(
                                                                offer.price_cents,
                                                                'EUR',
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className="text-muted-foreground text-sm">
                                                        {offer.summary}
                                                    </span>
                                                </span>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                    <InputError message={errors.offer} />
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
                                </Group>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
                                    <Group
                                        title="Quartiers visés"
                                        hint="Cliquez les arrondissements, ou tout Paris."
                                        icon={MapPin}
                                    >
                                        <DistrictMap
                                            value={form.data.districts}
                                            onChange={set('districts')}
                                        />
                                        <InputError
                                            message={errors.districts}
                                        />
                                    </Group>

                                    <Group
                                        title="Budget et calendrier"
                                        hint="Chaque mois, et quand emménager."
                                        icon={Wallet}
                                    >
                                        <Field
                                            label="Budget mensuel (€ / mois)"
                                            htmlFor="budget"
                                            error={errors.budget_cents}
                                        >
                                            <Input
                                                id="budget"
                                                name="budget"
                                                inputMode="decimal"
                                                placeholder="2500"
                                                autoFocus
                                                aria-invalid={Boolean(
                                                    errors.budget_cents,
                                                )}
                                                className="bg-background tabular-nums"
                                                value={form.data.budget}
                                                onChange={(e) =>
                                                    set('budget')(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {tightBudget && (
                                                <p
                                                    data-test="budget-hint"
                                                    className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                                                >
                                                    <TriangleAlert
                                                        className="mt-0.5 size-3.5 shrink-0"
                                                        aria-hidden
                                                    />
                                                    <span>
                                                        <span className="font-medium">
                                                            Budget serré
                                                        </span>{' '}
                                                        : en dessous de{' '}
                                                        <span className="tabular-nums">
                                                            {formatMoney(
                                                                TIGHT_BUDGET_CENTS,
                                                                'EUR',
                                                            )}
                                                        </span>{' '}
                                                        / mois, les options à
                                                        Paris sont très
                                                        limitées.
                                                    </span>
                                                </p>
                                            )}
                                        </Field>
                                        <Field
                                            label="Emménagement souhaité"
                                            htmlFor="arrival_at"
                                            error={errors.arrival_at}
                                        >
                                            <DatePicker
                                                id="arrival_at"
                                                aria-label="Emménagement souhaité"
                                                value={form.data.arrival_at}
                                                onChange={set('arrival_at')}
                                            />
                                            {urgentArrival && (
                                                <p
                                                    data-test="arrival-hint"
                                                    className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                                                >
                                                    <TriangleAlert
                                                        className="mt-0.5 size-3.5 shrink-0"
                                                        aria-hidden
                                                    />
                                                    <span>
                                                        <span className="font-medium">
                                                            Emménagement
                                                            imminent
                                                        </span>{' '}
                                                        :{' '}
                                                        {arrivalInDays <= 0
                                                            ? 'la date est déjà passée.'
                                                            : arrivalInDays ===
                                                                1
                                                              ? 'dans 1 jour, très court pour trouver un logement.'
                                                              : `dans ${arrivalInDays} jours, très court pour trouver un logement.`}
                                                    </span>
                                                </p>
                                            )}
                                        </Field>
                                    </Group>
                                </div>

                                <Group
                                    title="Conditions"
                                    hint="Un clic par réponse, rien n'est obligatoire."
                                    icon={ClipboardList}
                                >
                                    <ConditionChoices
                                        durations={durations}
                                        guarantors={guarantors}
                                        furnishedOptions={furnishedOptions}
                                        values={{
                                            duration: form.data.duration,
                                            guarantors: form.data.guarantors,
                                            furnished: form.data.furnished,
                                        }}
                                        onChange={(key, value) =>
                                            form.setData((data) => ({
                                                ...data,
                                                [key]: value,
                                            }))
                                        }
                                        errors={{
                                            duration: errors.duration,
                                            guarantors: errors.guarantors,
                                            furnished: errors.furnished,
                                        }}
                                    />
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <Field
                                            label="Ville d'origine"
                                            htmlFor="origin_city"
                                            error={errors.origin_city}
                                        >
                                            <Input
                                                id="origin_city"
                                                name="origin_city"
                                                autoComplete="off"
                                                className="bg-background"
                                                value={form.data.origin_city}
                                                onChange={(e) =>
                                                    set('origin_city')(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    </div>
                                    <Field
                                        label="Note sur le projet"
                                        htmlFor="message"
                                        error={errors.message}
                                    >
                                        <Textarea
                                            id="message"
                                            name="message"
                                            rows={4}
                                            className="bg-background"
                                            placeholder="Besoins, contraintes, contexte…"
                                            value={form.data.message}
                                            onChange={(e) =>
                                                set('message')(e.target.value)
                                            }
                                        />
                                    </Field>
                                </Group>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Group
                                    title="Qualité du lead"
                                    hint="Votre évaluation, pour prioriser le kanban."
                                    icon={Star}
                                >
                                    <div className="grid gap-2">
                                        <Label id="score-label">Note</Label>
                                        <div
                                            role="radiogroup"
                                            aria-labelledby="score-label"
                                            className="flex items-center gap-1"
                                        >
                                            {[1, 2, 3, 4, 5].map((value) => {
                                                const active =
                                                    form.data.score !== null &&
                                                    value <= form.data.score;

                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={
                                                            form.data.score ===
                                                            value
                                                        }
                                                        aria-label={`${value} sur 5`}
                                                        onClick={() =>
                                                            set('score')(
                                                                form.data
                                                                    .score ===
                                                                    value
                                                                    ? null
                                                                    : value,
                                                            )
                                                        }
                                                        onMouseEnter={() =>
                                                            setHoveredScore(
                                                                value,
                                                            )
                                                        }
                                                        onMouseLeave={() =>
                                                            setHoveredScore(
                                                                null,
                                                            )
                                                        }
                                                        onFocus={() =>
                                                            setHoveredScore(
                                                                value,
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            setHoveredScore(
                                                                null,
                                                            )
                                                        }
                                                        className={cn(
                                                            'rounded-md p-1 transition-colors',
                                                            active
                                                                ? 'text-amber-500'
                                                                : 'text-muted-foreground/40 hover:text-amber-400',
                                                        )}
                                                    >
                                                        <Star
                                                            className={cn(
                                                                'size-6',
                                                                active &&
                                                                    'fill-current',
                                                            )}
                                                            aria-hidden
                                                        />
                                                    </button>
                                                );
                                            })}
                                            <span className="ml-2 flex items-baseline gap-2 text-sm">
                                                {shownScore === null ? (
                                                    <span className="text-muted-foreground">
                                                        Non évaluée
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="font-medium">
                                                            {
                                                                scoreLabels[
                                                                    shownScore
                                                                ]
                                                            }
                                                        </span>
                                                        <span className="text-muted-foreground tabular-nums">
                                                            {shownScore} / 5
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <InputError message={errors.score} />
                                    </div>
                                    <Field
                                        label="Note de qualification"
                                        htmlFor="qualification_note"
                                        error={errors.qualification_note}
                                    >
                                        <Textarea
                                            id="qualification_note"
                                            name="qualification_note"
                                            rows={3}
                                            className="bg-background"
                                            placeholder="Motivation, solvabilité, points d'attention…"
                                            value={form.data.qualification_note}
                                            onChange={(e) =>
                                                set('qualification_note')(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                </Group>

                                <Group
                                    title="Suite à donner"
                                    hint="Qui suit ce lead, et quand le recontacter."
                                    icon={CalendarClock}
                                >
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                        <Field
                                            label="Suivi par"
                                            error={errors.assigned_to}
                                            className="sm:col-span-3"
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
                                                        form.data
                                                            .assigned_to ===
                                                        member.id;
                                                    const label =
                                                        member.id !== null &&
                                                        member.id ===
                                                            auth.user?.id
                                                            ? `${member.name} (moi)`
                                                            : member.name;

                                                    return (
                                                        <button
                                                            key={
                                                                member.id ??
                                                                'none'
                                                            }
                                                            type="button"
                                                            role="radio"
                                                            aria-checked={
                                                                checked
                                                            }
                                                            aria-label={label}
                                                            onClick={() =>
                                                                set(
                                                                    'assigned_to',
                                                                )(member.id)
                                                            }
                                                            className={cn(
                                                                'bg-background flex h-9 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors',
                                                                checked
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'hover:bg-sidebar-accent',
                                                            )}
                                                        >
                                                            <Avatar className="size-7">
                                                                {member.id !==
                                                                    null && (
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
                                        <Field
                                            label="Recontacter par"
                                            htmlFor="recontact_channel"
                                            error={errors.recontact_channel}
                                        >
                                            <Select
                                                value={
                                                    form.data
                                                        .recontact_channel ===
                                                    ''
                                                        ? 'none'
                                                        : form.data
                                                              .recontact_channel
                                                }
                                                onValueChange={(value) =>
                                                    set('recontact_channel')(
                                                        value === 'none'
                                                            ? ''
                                                            : (value as RecontactChannel),
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="recontact_channel"
                                                    aria-label="Recontacter par"
                                                    className="bg-background w-full"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        Pas de recontact prévu
                                                    </SelectItem>
                                                    {recontactChannels.map(
                                                        (channel) => (
                                                            <SelectItem
                                                                key={
                                                                    channel.value
                                                                }
                                                                value={
                                                                    channel.value
                                                                }
                                                            >
                                                                {channel.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field
                                            label="Recontacter le"
                                            htmlFor="recontact_at"
                                            error={errors.recontact_at}
                                        >
                                            <DatePicker
                                                id="recontact_at"
                                                aria-label="Recontacter le"
                                                value={form.data.recontact_at}
                                                onChange={set('recontact_at')}
                                            />
                                        </Field>
                                    </div>
                                </Group>
                            </>
                        )}
                    </form>
                </Panel>
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

LeadsCreate.layout = {
    breadcrumbs: [
        { title: 'Leads', href: leadsIndex() },
        { title: 'Converting Machine', href: '#' },
    ],
};
