import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowRight,
    Pencil,
    PlaneLanding,
    Star,
} from 'lucide-react';
import { useState } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DistrictMap } from '@/components/leads/district-map';
import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadSendDialog } from '@/components/leads/lead-send-dialog';
import { LeadVisioDialog } from '@/components/leads/lead-visio-dialog';
import { LeadHeaderMenu } from '@/components/leads/lead-header-menu';
import {
    LeadActivity,
    activityFilters,
    buildActivity,
    type ActivityFilter,
} from '@/components/leads/lead-activity';
import { LeadNoteComposer } from '@/components/leads/lead-note-composer';
import { LeadRecontact } from '@/components/leads/lead-recontact';
import { LeadReference } from '@/components/leads/lead-reference';
import {
    LeadShowBody,
    type Fact,
    type Kpi,
} from '@/components/leads/lead-show-body';
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
import { daysUntil, leadUrgency } from '@/lib/lead-urgency';
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
import type {
    LabeledOption,
    LeadDetail,
    LeadDuplicate,
    LeadInvoice,
    LeadLossReason,
    LeadDocumentRequest,
    LeadNote,
    LeadStatusChange,
    LeadStatusOption,
    LeadSending,
    RecontactChannel,
} from '@/types';

type Props = {
    lead: LeadDetail;
    invoices: LeadInvoice[];
    documentRequests: LeadDocumentRequest[];
    notes: LeadNote[];
    history: LeadStatusChange[];
    statuses: LeadStatusOption[];
    sending: LeadSending;
    recontactChannels: LabeledOption<RecontactChannel>[];
    duplicates: LeadDuplicate[];
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
    invoices,
    documentRequests,
    notes,
    history,
    statuses,
    sending,
    recontactChannels,
    duplicates,
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
            leadStatusRoute({ lead: lead.id }).url,
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
            leadContact({ lead: lead.id }).url,
            {},
            {
                preserveScroll: true,
                onFinish: () => setTouchingContact(false),
            },
        );
    };
    const urgency = leadUrgency(lead);

    const submitNote = () => {
        noteForm.post(storeNote({ lead: lead.id }).url, {
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
        { label: 'Offre visée', value: lead.offer_label ?? missing() },
        {
            label: 'Budget mensuel',
            value: budget ? `${budget} / mois` : missing(),
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
        },
        {
            label: "Ville d'origine",
            value: lead.origin_city ?? missing(),
        },
        {
            label: 'Quartiers visés',
            value: describeDistricts(lead.districts) ?? missing(),
        },
        {
            label: 'Type de bien',
            value:
                lead.property_types.length > 0
                    ? lead.property_types.map((type) => type.label).join(', ')
                    : missing(),
        },
        {
            label: "Durée d'installation",
            value: lead.duration_label ?? missing(),
        },
        { label: 'Garant', value: lead.guarantor_label ?? missing() },
        {
            label: 'Meublé',
            value: lead.furnished_label ?? missing('Indifférent'),
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
        },
        {
            label: 'Note de qualification',
            multiline: true,
            value: lead.qualification_note ?? missing(),
        },
    ];
    const kpis: Kpi[] = [
        { label: 'Budget mensuel', value: budget ?? '—' },
        {
            label: "Date d'arrivée",
            value: lead.arrival_at ? formatDate(lead.arrival_at) : '—',
        },
        { label: 'Offre visée', value: lead.offer_label ?? '—' },
        {
            label: 'Qualité',
            value:
                lead.score === null ? (
                    '—'
                ) : (
                    <span className="inline-flex items-center gap-1.5">
                        <Star
                            className="size-4 fill-current text-amber-500"
                            aria-hidden
                        />
                        {lead.score} / 5
                    </span>
                ),
        },
    ];
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
    const activityNode = (
        <LeadActivity
            leadId={lead.id}
            notes={notes}
            history={history}
            staffNames={staffNames}
            filter={filter}
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
                            {(urgency.contact === 'warn' ||
                                urgency.contact === 'late' ||
                                urgency.arrivalInDays !== null) && (
                                <div className="flex flex-wrap gap-1.5 pt-2">
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
                                    {urgency.arrivalInDays !== null && (
                                        <Badge
                                            variant="secondary"
                                            className="gap-1 bg-sky-50 py-0.5 pr-2 pl-1.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                        >
                                            <PlaneLanding
                                                className="size-3"
                                                aria-hidden
                                            />
                                            {urgency.arrivalInDays < 0
                                                ? 'Arrivé'
                                                : urgency.arrivalInDays === 0
                                                  ? "Arrive aujourd'hui"
                                                  : `Arrive dans ${urgency.arrivalInDays} j`}
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={leadEdit({ lead: lead.id })}>
                                <Pencil />
                                Modifier
                            </Link>
                        </Button>
                        <LeadHeaderMenu
                            lead={lead}
                            canDelete={can.delete}
                            lossReasons={lossReasons}
                        />
                    </div>
                </div>

                {duplicates.length > 0 && (
                    <Alert className="mb-6" data-testid="lead-duplicates">
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
                                            className="text-foreground underline-offset-4 hover:underline"
                                        >
                                            {duplicate.name}
                                        </Link>
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {duplicate.status_label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                <LeadShowBody
                    invoices={
                        <LeadInvoices
                            leadId={lead.id}
                            invoices={invoices}
                            canEdit={auth.user.role !== 'member'}
                        />
                    }
                    documents={
                        <LeadDocumentRequests
                            leadId={lead.id}
                            requests={documentRequests}
                        />
                    }
                    contact={contact}
                    facts={facts}
                    message={lead.message}
                    qualification={qualification}
                    map={map}
                    assign={assign}
                    recontact={
                        <LeadRecontact
                            lead={lead}
                            channels={recontactChannels}
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
                    activity={activityNode}
                    activityCount={buildActivity(notes, history).length}
                    activityFilters={filtersNode}
                    composer={composerNode}
                    kpis={kpis}
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
