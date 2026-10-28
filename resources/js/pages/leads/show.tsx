import { parisFormat } from '@/lib/datetime';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowRight,
    Banknote,
    CalendarDays,
    ExternalLink,
    Home,
    Hourglass,
    MapPin,
    Plane,
    BriefcaseBusiness,
    NotebookPen,
    Radio,
    ShieldCheck,
    Sofa,
    Tag,
    TriangleAlert,
    Video,
} from 'lucide-react';
import { useState } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { DistrictMap } from '@/components/leads/district-map';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadQuotes } from '@/components/leads/lead-quotes';
import { LeadSendDialog } from '@/components/leads/lead-send-dialog';
import { LeadVisioReportDialog } from '@/components/leads/lead-visio-report-dialog';
import { LeadAiCheck } from '@/components/leads/lead-ai-check';
import {
    LeadArchiveDialog,
    type ArchiveChoice,
} from '@/components/leads/lead-archive-dialog';
import { LeadHeaderMenu } from '@/components/leads/lead-header-menu';
import { LeadNextStep } from '@/components/leads/lead-next-step';
import { LeadReference } from '@/components/leads/lead-reference';
import { LeadQualificationEditor } from '@/components/leads/lead-qualification-editor';
import { LeadInboundMessage as InboundMessage } from '@/components/leads/lead-inbound-message';
import {
    LeadActivity,
    ActivityFilterBar,
    buildActivity,
    type ActivityFilter,
} from '@/components/leads/lead-activity';
import { LeadProject } from '@/components/leads/lead-project';
import type { InlineValue } from '@/components/inline-field';
import { LeadPropertyCard } from '@/components/leads/lead-property-card';
import { LeadActivitySheet } from '@/components/leads/lead-activity-sheet';
import { LeadNoteComposer } from '@/components/leads/lead-note-composer';
import { LeadRecontact } from '@/components/leads/lead-recontact';
import { LeadShowBody, type Fact } from '@/components/leads/lead-show-body';
import {
    LeadAssignMenu,
    initials,
    memberTone,
} from '@/components/leads/lead-assign-menu';
import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { ClampedText } from '@/components/clamped-text';
import { notify } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDate, formatMoney } from '@/lib/format';
import { daysUntil, firstContactTimer, leadUrgency } from '@/lib/lead-urgency';
import { useNow } from '@/hooks/use-now';
import { FirstContactBadge } from '@/components/leads/first-contact-badge';
import { budgetTier, budgetTierLabels } from '@/lib/paris-budget';
import { describeDistricts } from '@/lib/paris-districts';
import { hasProjectSentence, projectSentence } from '@/lib/project-sentence';
import {
    UNASSIGNED_WARN_DAYS,
    daysSinceCreation,
    leadNextStep,
} from '@/lib/lead-next-step';
import { cn } from '@/lib/utils';
import {
    contact as leadContact,
    edit as leadEdit,
    fields as leadFields,
    index as leadsIndex,
    status as leadStatusRoute,
} from '@/routes/leads';
import { store as storeNote } from '@/routes/leads/notes';
import { edit as ownerLeadEdit } from '@/routes/owners/leads';
import type {
    LabeledOption,
    LeadDetail,
    LeadEditOptions,
    LeadDirectoryOwner,
    LeadPropertyDetail,
    LeadDuplicate,
    LeadInboundMessage,
    LeadVerdictInfo,
    LeadInvoice,
    LeadLossReason,
    LeadNote,
    LeadStatusChange,
    LeadQuote,
    LeadStatusOption,
    LeadSending,
    RecontactChannel,
} from '@/types';

type Props = {
    lead: LeadDetail;
    /** Bien proposé, pour un lead propriétaire. */
    property?: LeadPropertyDetail | null;
    invoices: LeadInvoice[];
    quotes: LeadQuote[];
    notes: LeadNote[];
    history: LeadStatusChange[];
    statuses: LeadStatusOption[];
    sending: LeadSending;
    /** Nombre de biens de l'annuaire qui correspondent à la recherche (e-mail « n biens correspondent »). */
    matchingCount?: number;
    /** Listes des champs du projet modifiables en place. */
    editOptions?: LeadEditOptions;
    recontactChannels: LabeledOption<RecontactChannel>[];
    duplicates: LeadDuplicate[];
    /** Message d'arrivée du lead (site, appel, SMS), null s'il a été saisi par l'équipe. */
    inbound: LeadInboundMessage | null;
    /** Dernier appel ou SMS noté par la téléphonie, quelle que soit la source du lead. */
    lastCall?: LeadInboundMessage | null;
    /** Avis de l'assistant sur le lead (« AI check »). */
    verdict?: LeadVerdictInfo | null;
    can: { delete: boolean };
    lossReasons: LabeledOption<LeadLossReason>[];
    /** Fiche de l'annuaire des propriétaires créée depuis ce lead, s'il y en a une. */
    directoryOwner?: LeadDirectoryOwner | null;
};

/** Pictogramme discret devant le libellé d'un critère du projet. */
const factIcon = (Icon: typeof Home) => (
    <Icon className="size-3.5 shrink-0" aria-hidden />
);

/** Valeur absente : une seule formulation, en gris. */
const missing = (label = 'Non renseigné') => (
    <span className="text-muted-foreground font-normal">{label}</span>
);

const dateTime = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export default function LeadsShow({
    lead,
    property = null,
    invoices,
    quotes,
    notes,
    history,
    statuses,
    sending,
    matchingCount = 0,
    recontactChannels,
    duplicates,
    inbound,
    lastCall = null,
    verdict = null,
    can,
    lossReasons,
    directoryOwner = null,
    editOptions,
}: Props) {
    const { staff, auth, features } = usePage().props;
    // Champ du projet en cours d'enregistrement en place (nom côté serveur).
    const [savingField, setSavingField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const saveField = (name: string, value: InlineValue) => {
        setSavingField(name);
        setFieldErrors({});
        router.patch(
            leadFields({ lead: lead.uuid }).url,
            // Un champ composé (ville et pays) envoie ses deux colonnes.
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : { [name]: value },
            {
                preserveScroll: true,
                // Un refus du serveur (texte trop long, dernier moyen de
                // contact…) garde le champ ouvert avec son motif : sans cela
                // la saisie disparaissait sans un mot.
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ??
                        'Le champ n’a pas pu être enregistré.';
                    setFieldErrors({ [name]: message });
                    notify.error('Modification refusée', message);
                },
                onFinish: () => setSavingField(null),
            },
        );
    };
    const noteForm = useForm({ body: '' });
    const [filter, setFilter] = useState<ActivityFilter>('all');
    // Après un envoi de dossier, on propose de passer le lead en « Devis envoyé ».
    const [suggestQuote, setSuggestQuote] = useState(false);
    const [movingToQuote, setMovingToQuote] = useState(false);
    const moveToQuoteSent = () => {
        setMovingToQuote(true);
        router.patch(
            leadStatusRoute({ lead: lead.uuid }).url,
            { status: 'quote_sent' },
            {
                preserveScroll: true,
                // Le toast vient du serveur, comme pour tout changement de statut.
                onSuccess: () => setSuggestQuote(false),
                onFinish: () => setMovingToQuote(false),
            },
        );
    };
    const canSuggestQuote =
        suggestQuote &&
        lead.status !== 'quote_sent' &&
        lead.status !== 'converted' &&
        lead.status !== 'archived';
    const [touchingContact, setTouchingContact] = useState(false);
    const touchContact = () => {
        setTouchingContact(true);
        router.patch(
            leadContact({ lead: lead.uuid }).url,
            {},
            {
                preserveScroll: true,
                onFinish: () => setTouchingContact(false),
            },
        );
    };
    const urgency = leadUrgency(lead);
    const now = useNow(1_000);
    const firstContact = firstContactTimer(lead, now);
    const nextStep = leadNextStep(lead, now);
    const [recontactOpen, setRecontactOpen] = useState(false);
    // Archivage proposé par l'AI check : motif « Pas du tout qualifié », la raison de l'assistant en précision.
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const archiveFromVerdict = ({ reason, note }: ArchiveChoice) => {
        setArchiving(true);
        router.patch(
            leadStatusRoute({ lead: lead.uuid }).url,
            { status: 'archived', loss_reason: reason, loss_note: note },
            {
                preserveScroll: true,
                onFinish: () => {
                    setArchiving(false);
                    setArchiveOpen(false);
                },
            },
        );
    };

    const submitNote = () => {
        noteForm.post(storeNote({ lead: lead.uuid }).url, {
            preserveScroll: true,
            onSuccess: () => noteForm.reset(),
        });
    };

    const budget =
        lead.budget_cents === null
            ? null
            : formatMoney(lead.budget_cents, lead.currency);
    const arrivalDays =
        lead.arrival_at === null ? null : daysUntil(lead.arrival_at);
    const arrivalBadge =
        arrivalDays === null
            ? null
            : arrivalDays < 0
              ? `Arrivé depuis ${-arrivalDays} j`
              : arrivalDays === 0
                ? "Aujourd'hui"
                : `Dans ${arrivalDays} j`;
    const tier = budgetTier(lead.budget_cents ?? 0, lead.districts);
    const facts: Fact[] = [
        {
            label: 'Offre visée',
            icon: factIcon(Tag),
            value: lead.offer_label ?? missing(),
            empty: lead.offer_label === null,
            edit: editOptions && {
                name: 'offer',
                kind: 'select',
                value: lead.offer,
                options: editOptions.offers,
            },
        },
        {
            label: 'Budget mensuel',
            icon: factIcon(Banknote),
            value: budget ? `${budget} / mois` : missing(),
            empty: budget === null,
            edit: editOptions && {
                name: 'budget_cents',
                kind: 'money',
                value: lead.budget_cents,
                suffix: `${lead.currency} / mois`,
            },
            badge: tier ? budgetTierLabels[tier] : null,
            badgeTone:
                tier === 'tight'
                    ? 'warn'
                    : tier === 'comfortable'
                      ? 'good'
                      : 'default',
        },
        {
            label: "Date d'arrivée",
            icon: factIcon(CalendarDays),
            value: lead.arrival_at ? formatDate(lead.arrival_at) : missing(),
            badge: arrivalBadge,
            // Sous 30 jours l'arrivée presse : la même teinte que le kanban.
            badgeTone:
                arrivalDays !== null && arrivalDays <= 30 ? 'warn' : 'default',
            empty: lead.arrival_at === null,
            edit: editOptions && {
                name: 'arrival_at',
                kind: 'date',
                value: lead.arrival_at,
            },
        },
        {
            label: "Ville d'origine",
            icon: factIcon(Plane),
            value: lead.origin_city ? (
                <span className="inline-flex items-center gap-1.5">
                    <CountryFlag code={lead.origin_country} />
                    {lead.origin_city}
                </span>
            ) : (
                missing()
            ),
            empty: lead.origin_city === null,
            edit: editOptions && {
                name: 'origin_city',
                kind: 'city',
                value: lead.origin_city,
                country: lead.origin_country,
                enabled: features?.addressAutocomplete ?? false,
            },
        },
        {
            label: 'Quartiers visés',
            icon: factIcon(MapPin),
            value: describeDistricts(lead.districts) ?? missing(),
            empty: lead.districts.length === 0,
            edit: editOptions && {
                name: 'districts',
                kind: 'districts',
                value: lead.districts,
            },
        },
        {
            label: 'Type de bien',
            icon: factIcon(Home),
            value:
                lead.property_types.length > 0
                    ? lead.property_types.map((type) => type.label).join(', ')
                    : missing(),
            empty: lead.property_types.length === 0,
            edit: editOptions && {
                name: 'property_types',
                kind: 'multi',
                value: lead.property_types.map((type) => type.value),
                options: editOptions.propertyTypes,
            },
        },
        {
            label: "Durée d'installation",
            icon: factIcon(Hourglass),
            value: lead.duration_label ?? missing(),
            empty: lead.duration_label === null,
            edit: editOptions && {
                name: 'duration',
                kind: 'select',
                value: lead.duration,
                options: editOptions.durations,
            },
        },
        {
            label: 'Garant',
            icon: factIcon(ShieldCheck),
            value: lead.guarantor_label ?? missing(),
            empty: lead.guarantor_label === null,
            edit: editOptions && {
                name: 'guarantors',
                kind: 'multi',
                value: lead.guarantors,
                options: editOptions.guarantors,
            },
        },
        {
            label: 'Meublé',
            icon: factIcon(Sofa),
            value: lead.furnished_label ?? missing('Indifférent'),
            empty: lead.furnished_label === null,
            edit: editOptions && {
                name: 'furnished',
                kind: 'select',
                value: lead.furnished,
                options: editOptions.furnishedOptions,
            },
        },
        // Situation professionnelle et notes de l'équipe : pour un lead
        // locataire ; un lead propriétaire montre son bien, pas un dossier.
        ...(lead.segment === 'owner'
            ? []
            : ([
                  {
                      // Situation professionnelle : ce qu'une agence regarde avant le budget.
                      label: 'Situation pro',
                      icon: factIcon(BriefcaseBusiness),
                      value: lead.employment_status_label ?? missing(),
                      empty: lead.employment_status === null,
                      edit: editOptions && {
                          name: 'employment_status',
                          kind: 'select',
                          value: lead.employment_status,
                          options: editOptions.employmentStatuses,
                      },
                  },
                  {
                      // Notes libres de l'équipe sur le projet de relocation, modifiables là où elles se lisent.
                      label: 'Notes libres',
                      icon: factIcon(NotebookPen),
                      multiline: true,
                      value: lead.project_notes ? (
                          <ClampedText text={lead.project_notes} lines={4} />
                      ) : (
                          missing()
                      ),
                      empty: lead.project_notes === null,
                      edit: editOptions && {
                          name: 'project_notes',
                          kind: 'textarea',
                          value: lead.project_notes,
                          placeholder:
                              'Pour l’équipe : ce qu’on sait du projet de relocation, les réserves, les points à creuser…',
                      },
                  },
              ] satisfies Fact[])),
        {
            label: 'Source',
            icon: factIcon(Radio),
            value: lead.source_label,
            edit: editOptions && {
                name: 'source',
                kind: 'select',
                value: lead.source,
                options: editOptions.sources,
            },
        },
        {
            label: 'Précision sur la source',
            icon: factIcon(Radio),
            value: lead.source_note ?? missing(),
            empty: lead.source_note === null,
            edit: editOptions && {
                name: 'source_note',
                kind: 'text',
                value: lead.source_note,
                placeholder: 'Par qui, quel site, quel salon…',
            },
        },
    ];

    const contact: Fact[] = [
        {
            label: 'E-mail',
            empty: !lead.email,
            value: lead.email ? (
                <a
                    href={`mailto:${lead.email}`}
                    className="underline-offset-4 hover:underline"
                >
                    {lead.email}
                </a>
            ) : (
                missing()
            ),
            edit: editOptions && {
                name: 'email',
                kind: 'text',
                value: lead.email,
                placeholder: 'prenom@exemple.com',
            },
        },
        {
            label: 'Téléphone',
            empty: !lead.phone,
            value: lead.phone ? (
                <a
                    href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                    className="underline-offset-4 hover:underline"
                >
                    {lead.phone}
                </a>
            ) : (
                missing()
            ),
            edit: editOptions && {
                name: 'phone',
                kind: 'text',
                value: lead.phone,
                placeholder: '+33 6 12 34 56 78',
            },
        },
        {
            label: 'Société',
            value: lead.company ?? missing(),
            empty: lead.company === null,
            edit: editOptions && {
                name: 'company',
                kind: 'text',
                value: lead.company,
            },
        },
        {
            label: 'Langue',
            value: (
                <span className="inline-flex items-center gap-1.5">
                    <CountryFlag
                        code={lead.language === 'en' ? 'GB' : 'FR'}
                        className="size-3.5"
                    />
                    {lead.language_label}
                </span>
            ),
            edit: editOptions && {
                name: 'language',
                kind: 'select',
                value: lead.language,
                options: editOptions.languages,
            },
        },
    ];
    const qualification: Fact[] = [
        {
            label: 'Qualité du lead',
            value: lead.score === null ? missing() : `${lead.score} / 5`,
            empty: lead.score === null,
        },
        {
            label: 'Note de qualification',
            multiline: true,
            value: lead.qualification_note ?? missing(),
            empty: lead.qualification_note === null,
        },
    ];
    // Lead arrivé du site ou du téléphone et pas encore traité : son message
    // prime, les champs vides disparaissent au profit d'un bouton « Compléter ».
    const condensed = inbound !== null && lead.status === 'todo';
    // Lead propriétaire : la fiche montre le bien proposé et se modifie dans la Converting Machine propriétaire.
    const isOwner = lead.segment === 'owner';
    const editHref = isOwner
        ? ownerLeadEdit({ lead: lead.uuid })
        : leadEdit({ lead: lead.uuid });
    // Les champs restent visibles même vides : modifiables en place, c'est là
    // qu'on les complète (28 octobre 2026). Seule la qualification se condense.
    const onlyFilled = (list: Fact[]): Fact[] =>
        condensed ? list.filter((fact) => !fact.empty) : list;
    const visibleFacts = facts;
    // Le Projet se lit du plus parlant au plus détaillé : une phrase, puis les
    // quatre faits qu'on regarde d'abord, puis le reste en pastilles.
    const highlightLabels = [
        'Offre visée',
        'Budget mensuel',
        "Date d'arrivée",
        'Quartiers visés',
    ];
    const projectInput = {
        property_types: lead.property_types.map((type) => type.label),
        furnished_label: lead.furnished_label,
        districts: lead.districts,
        duration_label: lead.duration_label,
    };
    const sentence = hasProjectSentence(projectInput, budget)
        ? projectSentence(projectInput, budget)
        : null;
    const highlights = visibleFacts.filter((fact) =>
        highlightLabels.includes(fact.label),
    );
    const otherFacts = visibleFacts.filter(
        (fact) => !highlightLabels.includes(fact.label),
    );
    // Le message du site est déjà lu dans la carte d'arrivée, quel que soit
    // le statut du lead : il ne se répète pas en citation sous le projet.
    const projectMessage =
        inbound?.kind === 'website' &&
        (condensed || inbound.body.trim() === (lead.message ?? '').trim())
            ? null
            : lead.message;
    const map = (
        <div className="grid gap-2">
            <p className="text-muted-foreground text-sm">
                {lead.districts.length > 0
                    ? 'Quartiers visés sur la carte'
                    : 'Aucun quartier visé pour le moment'}
            </p>
            <DistrictMap value={lead.districts} readOnly />
        </div>
    );
    // Le responsable : son avatar et « Attribuer », un seul bouton qui ouvre
    // le menu du staff (le nom se lit dans l'infobulle et les initiales ;
    // demandé le 28 octobre 2026 à la place du nom et de « Je m'en occupe »).
    const unassignedFor =
        lead.assignee === null &&
        lead.status !== 'converted' &&
        lead.status !== 'archived'
            ? daysSinceCreation(lead)
            : null;
    const assign = (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
            <LeadAssignMenu lead={lead} size="sm" label="Attribuer" />
            {unassignedFor !== null &&
                unassignedFor >= UNASSIGNED_WARN_DAYS && (
                    /* Un lead en cours depuis des semaines sans responsable : on le dit. */
                    <Badge
                        variant="secondary"
                        data-testid="unassigned-warning"
                        className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    >
                        Non attribué depuis {unassignedFor} j
                    </Badge>
                )}
        </div>
    );
    // Appel vidéo programmé : la date, le lien Meet et le compte rendu, lus
    // dans la frise du suivi (l'invitation est partie au client à la
    // programmation).
    const visioStep = lead.visio_at ? (
        <div className="grid gap-1" data-test="visio-summary">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Video className="size-3.5" aria-hidden />
                Appel vidéo prévu
            </span>
            <span className="font-medium">
                {dateTime.format(new Date(lead.visio_at))}
            </span>
            {lead.visio_meet_link && (
                <a
                    href={lead.visio_meet_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                >
                    <ExternalLink className="size-3" aria-hidden />
                    Rejoindre sur Google Meet
                </a>
            )}
            <LeadVisioReportDialog lead={lead} />
        </div>
    ) : null;
    const lastContact = lead.last_contacted_at
        ? dateTime.format(new Date(lead.last_contacted_at))
        : 'Jamais';
    const staffNames = staff.map((member) => member.name);
    const activityCount = buildActivity(notes, history).length;
    const activityNode = (
        <LeadActivity
            leadUuid={lead.uuid}
            notes={notes}
            history={history}
            staffNames={staffNames}
            filter={filter}
            className="max-h-none"
        />
    );
    const filtersNode = (
        <ActivityFilterBar value={filter} onChange={setFilter} />
    );
    const composerNode = (
        <LeadNoteComposer
            value={noteForm.data.body}
            onChange={(value) => noteForm.setData('body', value)}
            onSubmit={submitNote}
            processing={noteForm.processing}
            error={noteForm.errors.body}
            candidates={staff.map((member) => ({
                id: member.id,
                name: member.name,
            }))}
        />
    );

    const urgent = urgency.contact === 'warn' || urgency.contact === 'late';
    // En-tête d'origine : pastille, nom, référence, statut, auteur, urgence,
    // et le menu « ⋯ » qui porte toutes les actions.
    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="lead-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                        lead.assignee
                            ? memberTone(lead.assignee.id)
                            : 'bg-muted text-muted-foreground',
                    )}
                >
                    {initials(lead.name)}
                </span>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-medium">
                            {lead.name}
                        </h1>
                        {lead.reference && (
                            <LeadReference reference={lead.reference} />
                        )}
                        <LeadStatusMenu
                            lead={lead}
                            statuses={statuses}
                            lossReasons={lossReasons}
                        />
                        {lead.status === 'archived' &&
                            lead.loss_reason_label && (
                                <Badge
                                    variant="secondary"
                                    title={lead.loss_note ?? undefined}
                                    data-testid="loss-reason"
                                >
                                    Motif : {lead.loss_reason_label}
                                    {lead.loss_note
                                        ? ` · ${lead.loss_note}`
                                        : ''}
                                </Badge>
                            )}
                    </div>
                    {(firstContact !== null || urgent) && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                            <FirstContactBadge timer={firstContact} />
                            {urgent && (
                                <Badge
                                    variant="secondary"
                                    data-urgency={urgency.contact}
                                    className={cn(
                                        'gap-1 py-0.5 pr-2 pl-1.5',
                                        urgency.contact === 'late'
                                            ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                            : 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
                                    )}
                                >
                                    <AlarmClock
                                        className="size-3"
                                        aria-hidden
                                    />
                                    Sans contact depuis{' '}
                                    {urgency.daysSinceContact} j
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <LeadHeaderMenu
                lead={lead}
                canDelete={can.delete}
                lossReasons={lossReasons}
                directoryOwner={directoryOwner}
                editHref={editHref.url}
            />
        </div>
    );
    // Alerte doublons, message d'arrivée et dernier appel : avant le dossier.
    const before = (
        <>
            {duplicates.length > 0 && (
                <Alert
                    variant="warning"

                    data-testid="lead-duplicates"
                >
                    <TriangleAlert aria-hidden />
                    <AlertTitle>
                        {duplicates.length > 1
                            ? `${duplicates.length} autres leads partagent cet e-mail ou ce téléphone`
                            : 'Un autre lead partage cet e-mail ou ce téléphone'}
                    </AlertTitle>
                    <AlertDescription>
                        <ul
                            role="list"
                            className="flex flex-wrap gap-x-4 gap-y-1"
                        >
                            {duplicates.map((duplicate) => (
                                <li key={duplicate.id}>
                                    <Link
                                        href={duplicate.url}
                                        className="font-medium underline-offset-4 hover:underline"
                                    >
                                        {duplicate.name}
                                    </Link>
                                    <span className="opacity-80">
                                        {' '}
                                        · {duplicate.status_label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {/* L'avis de l'assistant, juste au-dessus du message reçu. */}
            <LeadAiCheck
                verdict={verdict}
                onArchive={
                    lead.status === 'archived'
                        ? undefined
                        : () => setArchiveOpen(true)
                }
                onPlan={
                    lead.status === 'converted' || lead.status === 'archived'
                        ? undefined
                        : () => setRecontactOpen(true)
                }
            />
            <LeadArchiveDialog
                leadName={lead.name}
                reasons={lossReasons}
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                onConfirm={archiveFromVerdict}
                busy={archiving}
                initial={{
                    reason: 'not_qualified',
                    note: verdict?.reason ?? '',
                }}
            />
            {inbound ? (
                <InboundMessage lead={lead} inbound={inbound} />
            ) : (
                /* Repère stable : même sans message d'arrivée, la ligne existe. */
                <section
                    aria-label="Message reçu"
                    data-testid="lead-inbound-empty"
                    className="bg-sidebar flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5"
                >
                    <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
                        Message reçu
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Aucun message d’arrivée : lead saisi par l’équipe.
                    </p>
                </section>
            )}

            {/* Appel ou SMS reçu après l'arrivée : son résumé se lit ici,
                pas au fond des notes. La même note n'est jamais montrée
                deux fois (le lead créé par cet appel l'a déjà en tête). */}
            {lastCall && lastCall.note_id !== inbound?.note_id && (
                <InboundMessage
                    lead={lead}
                    inbound={lastCall}
                    title={
                        lastCall.kind === 'sms'
                            ? 'Dernier SMS reçu'
                            : 'Résumé du dernier appel'
                    }
                    storageKey="last-call"
                />
            )}
        </>
    );

    return (
        <>
            <Head title={`Lead ${lead.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-10 lg:pb-0">
                <LeadShowBody
                    header={
                        <>
                            {/* Le prochain geste, avant tout le reste. */}
                            <LeadNextStep
                                step={nextStep}
                                onRecontact={() => setRecontactOpen(true)}
                                onTouch={touchContact}
                                touching={touchingContact}
                            />
                            {header}
                        </>
                    }
                    before={before}
                    completeUrl={condensed ? editHref.url : undefined}
                    invoices={
                        <LeadInvoices
                            leadId={lead.id}
                            leadUuid={lead.uuid}
                            invoices={invoices}
                            canEdit={auth.user.role !== 'member'}
                        />
                    }
                    quotes={
                        <LeadQuotes
                            leadId={lead.id}
                            leadUuid={lead.uuid}
                            quotes={quotes}
                            canEdit={auth.user.role !== 'member'}
                        />
                    }
                    contact={contact}
                    onSaveField={editOptions ? saveField : undefined}
                    savingField={savingField}
                    // Un lead propriétaire décrit un bien, pas un projet de locataire.
                    facts={isOwner ? [] : visibleFacts}
                    project={
                        isOwner ? (
                            property ? (
                                <LeadPropertyCard property={property} />
                            ) : undefined
                        ) : (
                            <LeadProject
                                sentence={sentence}
                                highlights={highlights}
                                facts={otherFacts}
                                message={projectMessage}
                                map={map}
                                onSave={editOptions ? saveField : undefined}
                                saving={savingField}
                                fieldErrors={fieldErrors}
                            />
                        )
                    }
                    projectHasMessage={!isOwner}
                    projectTitle={isOwner ? 'Bien proposé' : 'Projet'}
                    projectFilled={isOwner && property !== null}
                    message={projectMessage}
                    qualification={onlyFilled(qualification)}
                    qualificationEditor={
                        <LeadQualificationEditor lead={lead} />
                    }
                    assign={assign}
                    recontact={
                        <LeadRecontact
                            lead={lead}
                            channels={recontactChannels}
                            open={recontactOpen}
                            onOpenChange={setRecontactOpen}
                        />
                    }
                    visio={visioStep}
                    lastContact={lastContact}
                    onTouchContact={touchContact}
                    touchingContact={touchingContact}
                    send={
                        <div className="grid gap-2">
                            <LeadSendDialog
                                lead={lead}
                                sending={sending}
                                matchingCount={matchingCount}
                                className="w-full"
                                onSent={() => setSuggestQuote(true)}
                            />
                            {canSuggestQuote && (
                                <Button
                                    type="button"
                                    className="w-full"
                                    disabled={movingToQuote}
                                    onClick={moveToQuoteSent}
                                >
                                    <ArrowRight aria-hidden />
                                    Passer en « Devis envoyé »
                                </Button>
                            )}
                        </div>
                    }
                    activity={
                        <LeadActivitySheet
                            count={activityCount}
                            label="Notes"
                            showCount
                            filters={filtersNode}
                            composer={composerNode}
                        >
                            {activityNode}
                        </LeadActivitySheet>
                    }
                    quoteCount={quotes.length}
                    invoiceCount={invoices.length}
                />
            </div>
        </>
    );
}

LeadsShow.layout = {
    breadcrumbs: [
        { title: 'Leads', href: leadsIndex() },
        { title: 'Détail', href: '#' },
    ],
};
