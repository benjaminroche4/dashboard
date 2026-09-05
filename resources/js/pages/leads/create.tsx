import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Star,
    TriangleAlert,
    UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { FormActionBar } from '@/components/form-action-bar';
import { DistrictMap } from '@/components/leads/district-map';
import { PhoneInput } from '@/components/phone-input';
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
import { Separator } from '@/components/ui/separator';
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
import { budgetHint, budgetTiers } from '@/lib/paris-budget';
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
        'guarantor',
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

/** Indicateur d'étapes, discret : numéro, libellé, filet entre les étapes. */
function Stepper({
    current,
    visited,
    onSelect,
}: {
    current: StepNumber;
    visited: Set<number>;
    onSelect: (step: StepNumber) => void;
}) {
    return (
        <ol role="list" aria-label="Étapes" className="flex items-center gap-3">
            {steps.map((step, index) => {
                const done = step.number < current;
                const active = step.number === current;
                const reachable = visited.has(step.number) || done;

                return (
                    <li
                        key={step.number}
                        className={cn(
                            'flex items-center gap-3',
                            index < steps.length - 1 && 'flex-1',
                        )}
                    >
                        <button
                            type="button"
                            disabled={!reachable}
                            aria-current={active ? 'step' : undefined}
                            onClick={() => onSelect(step.number)}
                            className={cn(
                                'flex items-center gap-2 rounded-md text-sm outline-none focus-visible:ring-2 disabled:cursor-default',
                                active
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground',
                                reachable && !active && 'hover:text-foreground',
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                                    active &&
                                        'bg-primary text-primary-foreground border-primary',
                                    done &&
                                        'bg-primary/10 border-primary/40 text-primary',
                                )}
                            >
                                {done ? (
                                    <Check className="size-3.5" />
                                ) : (
                                    step.number
                                )}
                            </span>
                            <span className="whitespace-nowrap">
                                {step.title}
                            </span>
                        </button>
                        {index < steps.length - 1 && (
                            <span
                                aria-hidden
                                className={cn(
                                    'h-px flex-1',
                                    done ? 'bg-primary/40' : 'bg-border',
                                )}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

/** Groupe de champs, comme sur la facture : titre, aide, grille. */
function Group({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-5">
            <div>
                <h2 className="text-base font-medium">{title}</h2>
                {hint && (
                    <p className="text-muted-foreground text-sm">{hint}</p>
                )}
            </div>
            {children}
        </section>
    );
}

function Field({
    label,
    htmlFor,
    error,
    hint,
    children,
    className,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && !error && (
                <p className="text-muted-foreground text-xs">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}

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
}: Props) {
    const editing = lead !== undefined;
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
                  guarantor: '',
                  furnished: '',
                  message: '',
                  score: null,
                  recontact_channel: '',
                  recontact_at: '',
                  qualification_note: '',
                  assigned_to: auth.user?.id ?? null,
              },
    );
    // Erreurs détectées localement avant l'envoi ; celles du serveur priment.
    const [localErrors, setLocalErrors] = useState<LeadFormErrors>({});
    const errors: Record<string, string | undefined> = {
        ...localErrors,
        ...(form.errors as Record<string, string>),
    };
    const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
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
                    lead ? leadShow({ lead: lead.id }).url : leadsIndex().url,
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
    const hint = budgetHint(form.data.districts);
    const selectOptions = <T extends string>(
        options: LabeledOption<T>[],
        none: string,
    ) => (
        <SelectContent>
            <SelectItem value="none">{none}</SelectItem>
            {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    );

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
            guarantor: data.guarantor === '' ? null : data.guarantor,
            furnished: data.furnished === '' ? null : data.furnished,
            recontact_channel:
                data.recontact_channel === '' ? null : data.recontact_channel,
            budget_cents:
                data.budget.trim() === '' ? null : toCents(data.budget),
        }));

        if (lead) {
            form.put(update({ lead: lead.id }).url);
        } else {
            form.post(store().url);
        }
    };

    const cancelHref = lead ? leadShow({ lead: lead.id }) : leadsIndex();

    return (
        <>
            <Head
                title={editing ? `Modifier ${lead.name}` : 'Converting Machine'}
            />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
                <div className="grid gap-6 pt-8 pb-8">
                    <div>
                        <h1 className="text-lg font-medium">
                            {editing
                                ? `Modifier ${lead.name}`
                                : 'Converting Machine'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {editing
                                ? 'Le statut et la place dans le kanban ne changent pas.'
                                : 'Le contact suffit pour créer le lead. Le projet et la qualification peuvent attendre.'}
                        </p>
                    </div>
                    <Stepper current={step} visited={visited} onSelect={goTo} />
                </div>

                <form
                    ref={formRef}
                    id="lead-form"
                    onSubmit={submit}
                    noValidate
                    className="grid gap-8 pb-8"
                    data-test="lead-form"
                >
                    <p className="text-muted-foreground -mb-4 text-xs font-medium tracking-wide uppercase">
                        Étape {step} sur {steps.length}
                    </p>

                    {step === 1 && (
                        <>
                            <Group
                                title="Contact"
                                hint="Un e-mail ou un téléphone suffit pour commencer."
                            >
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field
                                        label="Prénom"
                                        htmlFor="first_name"
                                        error={errors.first_name}
                                    >
                                        <Input
                                            id="first_name"
                                            name="first_name"
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
                                    <Field
                                        label="Société"
                                        htmlFor="company"
                                        error={errors.company}
                                        hint="Facultatif."
                                    >
                                        <Input
                                            id="company"
                                            name="company"
                                            autoComplete="off"
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
                                                    className="bg-background px-4"
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
                                    <Alert data-test="duplicates">
                                        <TriangleAlert />
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
                                                        <span className="text-muted-foreground text-xs">
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

                            <Separator />

                            <Group
                                title="Formule"
                                hint="Celle que le prospect envisage. Modifiable plus tard."
                            >
                                <RadioGroup
                                    value={form.data.offer}
                                    onValueChange={(value) =>
                                        set('offer')(value as OfferValue)
                                    }
                                    className="grid gap-3 sm:grid-cols-2"
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
                                                    <span className="text-muted-foreground text-sm font-normal tabular-nums">
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

                            <Separator />

                            <Group title="Source">
                                <div className="grid gap-5 sm:grid-cols-2">
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
                                        hint="Recommandé par…, campagne…"
                                    >
                                        <Input
                                            id="source_note"
                                            name="source_note"
                                            autoComplete="off"
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
                            <Group
                                title="Budget et calendrier"
                                hint="Ce que le prospect peut mettre chaque mois, et quand il souhaite emménager."
                            >
                                <div className="grid gap-5 sm:grid-cols-2">
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
                                                set('budget')(e.target.value)
                                            }
                                        />
                                        <div
                                            className="flex flex-wrap gap-1.5"
                                            role="group"
                                            aria-label="Paliers de budget"
                                        >
                                            {budgetTiers.map((tier) => {
                                                const selected =
                                                    toCents(
                                                        form.data.budget,
                                                    ) ===
                                                    tier * 100;

                                                return (
                                                    <Button
                                                        key={tier}
                                                        type="button"
                                                        variant={
                                                            selected
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                        size="sm"
                                                        aria-pressed={selected}
                                                        onClick={() =>
                                                            set('budget')(
                                                                String(tier),
                                                            )
                                                        }
                                                    >
                                                        {tier.toLocaleString(
                                                            'fr-FR',
                                                        )}{' '}
                                                        €
                                                    </Button>
                                                );
                                            })}
                                        </div>
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
                                    </Field>
                                </div>
                                {hint &&
                                    form.data.budget.trim() !== '' &&
                                    toCents(form.data.budget) <
                                        hint.minimumCents && (
                                        <Alert data-test="budget-hint">
                                            <TriangleAlert />
                                            <AlertTitle>
                                                Budget serré pour ces choix
                                            </AlertTitle>
                                            <AlertDescription>
                                                Comptez plutôt{' '}
                                                <span className="text-foreground font-medium tabular-nums">
                                                    {formatMoney(
                                                        hint.minimumCents,
                                                        'EUR',
                                                    )}{' '}
                                                    / mois
                                                </span>{' '}
                                                pour {hint.propertyLabel} dans{' '}
                                                {hint.zoneLabel}. Repère
                                                indicatif, à nuancer selon le
                                                bien.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                            </Group>

                            <Separator />

                            <Group
                                title="Quartiers visés"
                                hint="Cliquez les arrondissements, ou tout Paris."
                            >
                                <DistrictMap
                                    value={form.data.districts}
                                    onChange={set('districts')}
                                />
                                <InputError message={errors.districts} />
                            </Group>

                            <Separator />

                            <Group title="Conditions">
                                <div className="grid gap-5 sm:grid-cols-3">
                                    <Field
                                        label="Durée d'installation"
                                        htmlFor="duration"
                                        error={errors.duration}
                                    >
                                        <Select
                                            value={
                                                form.data.duration === ''
                                                    ? 'none'
                                                    : form.data.duration
                                            }
                                            onValueChange={(value) =>
                                                set('duration')(
                                                    value === 'none'
                                                        ? ''
                                                        : (value as LeadDuration),
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="duration"
                                                aria-label="Durée d'installation"
                                                className="bg-background w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            {selectOptions(
                                                durations,
                                                'À définir',
                                            )}
                                        </Select>
                                    </Field>
                                    <Field
                                        label="Type de garant"
                                        htmlFor="guarantor"
                                        error={errors.guarantor}
                                    >
                                        <Select
                                            value={
                                                form.data.guarantor === ''
                                                    ? 'none'
                                                    : form.data.guarantor
                                            }
                                            onValueChange={(value) =>
                                                set('guarantor')(
                                                    value === 'none'
                                                        ? ''
                                                        : (value as GuarantorType),
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="guarantor"
                                                aria-label="Type de garant"
                                                className="bg-background w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            {selectOptions(
                                                guarantors,
                                                'À définir',
                                            )}
                                        </Select>
                                    </Field>
                                    <Field
                                        label="Meublé"
                                        htmlFor="furnished"
                                        error={errors.furnished}
                                    >
                                        <Select
                                            value={
                                                form.data.furnished === ''
                                                    ? 'none'
                                                    : form.data.furnished
                                            }
                                            onValueChange={(value) =>
                                                set('furnished')(
                                                    value === 'none'
                                                        ? ''
                                                        : (value as Furnished),
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="furnished"
                                                aria-label="Meublé"
                                                className="bg-background w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            {selectOptions(
                                                furnishedOptions,
                                                'À définir',
                                            )}
                                        </Select>
                                    </Field>
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
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
                                                            form.data.score ===
                                                                value
                                                                ? null
                                                                : value,
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
                                        <span className="text-muted-foreground ml-2 text-sm">
                                            {form.data.score === null
                                                ? 'Non évaluée'
                                                : `${form.data.score} / 5`}
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

                            <Separator />

                            <Group
                                title="Suite à donner"
                                hint="Qui suit ce lead, et quand le recontacter."
                            >
                                <div className="grid gap-5 sm:grid-cols-3">
                                    <Field
                                        label="Suivi par"
                                        htmlFor="assigned_to"
                                        error={errors.assigned_to}
                                    >
                                        <Select
                                            value={
                                                form.data.assigned_to === null
                                                    ? 'none'
                                                    : String(
                                                          form.data.assigned_to,
                                                      )
                                            }
                                            onValueChange={(value) =>
                                                set('assigned_to')(
                                                    value === 'none'
                                                        ? null
                                                        : Number(value),
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="assigned_to"
                                                aria-label="Suivi par"
                                                className="bg-background w-full"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <UserRound />
                                                    Personne pour l'instant
                                                </SelectItem>
                                                {staff.map((member) => (
                                                    <SelectItem
                                                        key={member.id}
                                                        value={String(
                                                            member.id,
                                                        )}
                                                    >
                                                        {member.name}
                                                        {member.id ===
                                                        auth.user?.id
                                                            ? ' (moi)'
                                                            : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field
                                        label="Recontacter par"
                                        htmlFor="recontact_channel"
                                        error={errors.recontact_channel}
                                    >
                                        <Select
                                            value={
                                                form.data.recontact_channel ===
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
                                            {selectOptions(
                                                recontactChannels,
                                                'Pas de recontact prévu',
                                            )}
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
            </div>
            <FormActionBar innerClassName="max-w-3xl">
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
