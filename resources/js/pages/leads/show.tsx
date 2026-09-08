import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlarmClock, ArrowRight, Pencil, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DistrictMap } from '@/components/leads/district-map';
import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadQuotes } from '@/components/leads/lead-quotes';
import { LeadSendDialog } from '@/components/leads/lead-send-dialog';
import { LeadVisioDialog } from '@/components/leads/lead-visio-dialog';
import { LeadAgentCard } from '@/components/leads/lead-agent-card';
import { LeadPartnersCard } from '@/components/leads/lead-partners-card';
import { LeadConvertDialog } from '@/components/leads/lead-convert-dialog';
import { LeadHeaderMenu } from '@/components/leads/lead-header-menu';
import { LeadQualificationCard } from '@/components/leads/lead-qualification-card';
import { LeadInboundMessage as InboundMessage } from '@/components/leads/lead-inbound-message';
import {
    LeadActivity,
    activityFilters,
    buildActivity,
    type ActivityFilter,
} from '@/components/leads/lead-activity';
import { LeadProject } from '@/components/leads/lead-project';
import { LeadPropertyCard } from '@/components/leads/lead-property-card';
import { LeadActivitySheet } from '@/components/leads/lead-activity-sheet';
import { LeadNoteComposer } from '@/components/leads/lead-note-composer';
import { LeadRecontact } from '@/components/leads/lead-recontact';
import { LeadReference } from '@/components/leads/lead-reference';
import { LeadShowBody, type Fact } from '@/components/leads/lead-show-body';
import {
    LeadAssignMenu,
    initials,
    memberTone,
} from '@/components/leads/lead-assign-menu';
import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatDate, formatMoney } from '@/lib/format';
import { daysUntil, firstContactTimer, leadUrgency } from '@/lib/lead-urgency';
import { useNow } from '@/hooks/use-now';
import { FirstContactBadge } from '@/components/leads/first-contact-badge';
import { budgetTier, budgetTierLabels } from '@/lib/paris-budget';
import { notify } from '@/lib/toast';
import { describeDistricts } from '@/lib/paris-districts';
import { cn } from '@/lib/utils';
import {
    contact as leadContact,
    edit as leadEdit,
    index as leadsIndex,
    status as leadStatusRoute,
} from '@/routes/leads';
import { store as storeNote } from '@/routes/leads/notes';
import { edit as ownerLeadEdit } from '@/routes/owners/leads';
import type {
    LabeledOption,
    LeadDetail,
    LeadPropertyDetail,
    AgentOption,
    LeadPartnerLink,
    PartnerOption,
    PartnerRoleOption,
    LeadDuplicate,
    LeadInboundMessage,
    LeadQualification,
    LeadInvoice,
    LeadLossReason,
    LeadDocumentRequest,
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
    documentRequests: LeadDocumentRequest[];
    notes: LeadNote[];
    history: LeadStatusChange[];
    statuses: LeadStatusOption[];
    sending: LeadSending;
    recontactChannels: LabeledOption<RecontactChannel>[];
    duplicates: LeadDuplicate[];
    /** Message d'arrivée du lead (site, appel, SMS), null s'il a été saisi par l'équipe. */
    inbound: LeadInboundMessage | null;
    /** Qualification proposée par l'assistant IA, en attente de relecture. */
    qualification?: LeadQualification | null;
    /** Annuaire des agents immobiliers pour la carte « Agent en contact ». */
    agents: AgentOption[];
    /** Partenaires du dossier, annuaire et rôles pour la carte « Partenaires du dossier ». */
    partners: LeadPartnerLink[];
    partnerOptions: PartnerOption[];
    partnerRoles: PartnerRoleOption[];
    can: { delete: boolean };
    lossReasons: LabeledOption<LeadLossReason>[];
};

/** Valeur absente : une seule formulation, en gris. */
const missing = (label = 'Non renseigné') => (
    <span className="text-muted-foreground font-normal">{label}</span>
);

const dateTime = new Intl.DateTimeFormat('fr-FR', {
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
    documentRequests,
    notes,
    history,
    statuses,
    sending,
    recontactChannels,
    duplicates,
    inbound,
    qualification: aiQualification = null,
    agents,
    partners,
    partnerOptions,
    partnerRoles,
    can,
    lossReasons,
}: Props) {
    const { staff, auth } = usePage().props;
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
                onSuccess: () => {
                    setSuggestQuote(false);
                    notify.success('Lead passé en « Devis envoyé ».');
                },
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
    const firstContact = firstContactTimer(lead, useNow(1_000));

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
            value: lead.offer_label ?? missing(),
            empty: lead.offer_label === null,
        },
        {
            label: 'Budget mensuel',
            value: budget ? `${budget} / mois` : missing(),
            empty: budget === null,
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
            value: lead.arrival_at ? formatDate(lead.arrival_at) : missing(),
            badge: arrivalBadge,
            empty: lead.arrival_at === null,
        },
        {
            label: "Ville d'origine",
            value: lead.origin_city ?? missing(),
            empty: lead.origin_city === null,
        },
        {
            label: 'Quartiers visés',
            value: describeDistricts(lead.districts) ?? missing(),
            empty: lead.districts.length === 0,
        },
        {
            label: 'Type de bien',
            value:
                lead.property_types.length > 0
                    ? lead.property_types.map((type) => type.label).join(', ')
                    : missing(),
            empty: lead.property_types.length === 0,
        },
        {
            label: "Durée d'installation",
            value: lead.duration_label ?? missing(),
            empty: lead.duration_label === null,
        },
        {
            label: 'Garant',
            value: lead.guarantor_label ?? missing(),
            empty: lead.guarantor_label === null,
        },
        {
            label: 'Meublé',
            value: lead.furnished_label ?? missing('Indifférent'),
            empty: lead.furnished_label === null,
        },
        {
            label: 'Source',
            value: lead.source_note
                ? `${lead.source_label} · ${lead.source_note}`
                : lead.source_label,
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
        },
        {
            label: 'Société',
            value: lead.company ?? missing(),
            empty: lead.company === null,
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
    const onlyFilled = (list: Fact[]): Fact[] =>
        condensed ? list.filter((fact) => !fact.empty) : list;
    const visibleFacts = onlyFilled(
        condensed ? facts.filter((fact) => fact.label !== 'Source') : facts,
    );
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
    const assign = (
        <div className="flex items-center gap-3">
            <LeadAssignMenu lead={lead} size="md" />
            <div className="grid min-w-0">
                <span className="truncate text-sm font-medium">
                    {lead.assignee?.name ?? 'Non attribué'}
                </span>
                <span className="text-muted-foreground text-xs">
                    {lead.assignee
                        ? 'Cliquez sur l’avatar pour réattribuer'
                        : 'Cliquez sur l’avatar pour attribuer'}
                </span>
            </div>
        </div>
    );
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
        <ToggleGroup
            type="single"
            size="sm"
            value={filter}
            onValueChange={(value) =>
                value && setFilter(value as ActivityFilter)
            }
            aria-label="Filtrer l’activité"
            className="gap-0.5"
        >
            {activityFilters.map((option) => (
                <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className="data-[state=on]:bg-background h-7 rounded-md px-2 text-xs first:rounded-md last:rounded-md data-[state=on]:shadow-xs"
                >
                    {option.label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
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

    return (
        <>
            <Head title={`Lead ${lead.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-start justify-between gap-4 pt-8 pb-6">
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
                            <p
                                className="text-muted-foreground flex flex-wrap items-center gap-1.5 pt-1 text-xs"
                                data-test="lead-author"
                            >
                                {lead.author ? (
                                    <>
                                        <Avatar className="size-4">
                                            <AvatarImage
                                                src={
                                                    lead.author.avatar ??
                                                    undefined
                                                }
                                                alt=""
                                            />
                                            <AvatarFallback className="text-[8px]">
                                                {initials(lead.author.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>
                                            Créée par{' '}
                                            <span className="text-foreground font-medium">
                                                {lead.author.name}
                                            </span>
                                            {lead.created_at
                                                ? ` le ${dateTime.format(new Date(lead.created_at))}`
                                                : ''}
                                        </span>
                                    </>
                                ) : (
                                    <span>
                                        Créée
                                        {lead.created_at
                                            ? ` le ${dateTime.format(new Date(lead.created_at))}`
                                            : ''}
                                        , auteur inconnu
                                    </span>
                                )}
                            </p>
                            {(firstContact !== null ||
                                urgency.contact === 'warn' ||
                                urgency.contact === 'late') && (
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    <FirstContactBadge timer={firstContact} />
                                    {(urgency.contact === 'warn' ||
                                        urgency.contact === 'late') && (
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
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={editHref}>
                                <Pencil />
                                Modifier
                            </Link>
                        </Button>
                        <LeadConvertDialog
                            leadUuid={lead.uuid}
                            leadName={lead.name}
                            status={lead.status}
                        />
                        <LeadHeaderMenu
                            lead={lead}
                            canDelete={can.delete}
                            lossReasons={lossReasons}
                        />
                    </div>
                </div>

                {duplicates.length > 0 && (
                    <Alert
                        variant="warning"
                        className="mb-6"
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

                {inbound && (
                    <InboundMessage
                        lead={lead}
                        inbound={inbound}
                        className="mb-8"
                    />
                )}

                {lead.status !== 'converted' && lead.status !== 'archived' && (
                    <LeadQualificationCard
                        lead={lead}
                        qualification={aiQualification}
                        className="mb-8"
                    />
                )}

                <LeadShowBody
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
                            leadUuid={lead.uuid}
                            quotes={quotes}
                            canEdit={auth.user.role !== 'member'}
                        />
                    }
                    documents={
                        <LeadDocumentRequests
                            leadUuid={lead.uuid}
                            requests={documentRequests}
                        />
                    }
                    contact={onlyFilled(contact)}
                    facts={visibleFacts}
                    project={
                        isOwner ? (
                            property ? (
                                <LeadPropertyCard property={property} />
                            ) : undefined
                        ) : (
                            <LeadProject facts={visibleFacts} map={map} />
                        )
                    }
                    projectTitle={isOwner ? 'Bien proposé' : 'Projet'}
                    projectFilled={isOwner && property !== null}
                    message={
                        inbound?.kind === 'website' && condensed
                            ? null
                            : lead.message
                    }
                    qualification={onlyFilled(qualification)}
                    map={map}
                    assign={assign}
                    recontact={
                        <LeadRecontact
                            lead={lead}
                            channels={recontactChannels}
                        />
                    }
                    agent={<LeadAgentCard lead={lead} agents={agents} />}
                    partners={
                        <LeadPartnersCard
                            lead={lead}
                            links={partners}
                            partners={partnerOptions}
                            roles={partnerRoles}
                        />
                    }
                    lastContact={lastContact}
                    onTouchContact={touchContact}
                    touchingContact={touchingContact}
                    actions={
                        <div className="grid gap-2">
                            <LeadVisioDialog lead={lead} />
                            <LeadSendDialog
                                lead={lead}
                                sending={sending}
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
                            filters={filtersNode}
                            composer={composerNode}
                        >
                            {activityNode}
                        </LeadActivitySheet>
                    }
                    activityCount={activityCount}
                    counts={{
                        commercial:
                            quotes.length +
                            invoices.length +
                            documentRequests.length,
                        partners: partners.length + (lead.agent ? 1 : 0),
                    }}
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
