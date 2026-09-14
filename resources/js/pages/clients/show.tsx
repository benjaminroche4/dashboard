import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    CalendarClock,
    ExternalLink,
    FilePlus2,
    FileSignature,
    Info,
    MoreHorizontal,
    Pencil,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ClientAssigneeMenu } from '@/components/clients/client-assignee-menu';
import { LeadActivitySheet } from '@/components/leads/lead-activity-sheet';
import { ClientPriorityMenu } from '@/components/clients/client-priority';
import { ArrivalProgress } from '@/components/clients/arrival-progress';
import { OfferBadge } from '@/components/clients/offer-badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ClientPeople } from '@/components/clients/client-people';
import { ClientProperties } from '@/components/clients/client-properties';
import { ClientOverview } from '@/components/clients/client-overview';
import { ClientAgencyMatches } from '@/components/clients/client-agency-matches';
import { dossierAttention } from '@/lib/dossier-attention';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderIllustration } from '@/components/folder-card';
import {
    ActivityFilterBar,
    LeadActivity,
    type ActivityFilter,
} from '@/components/leads/lead-activity';
import { LeadAgentCard } from '@/components/leads/lead-agent-card';
import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';
import { LeadNoteComposer } from '@/components/leads/lead-note-composer';
import { LeadPartnersCard } from '@/components/leads/lead-partners-card';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadQuotes } from '@/components/leads/lead-quotes';
import { DetailSection } from '@/components/real-estate/detail-header';
import { VisitDaySection } from '@/components/visits/visit-day-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatMoney } from '@/lib/format';
import { groupVisitsByDay } from '@/lib/visits';
import {
    edit as clientEdit,
    index as clientsIndex,
    reopen as reopenClient,
} from '@/routes/clients';
import { create as invoiceCreate } from '@/routes/invoices';
import {
    create as visitCreate,
    show as visitShow,
} from '@/routes/clients/visits';
import { show as leadShow } from '@/routes/leads';
import { store as storeNote } from '@/routes/leads/notes';
import { create as quoteCreate } from '@/routes/tools/quotes';
import { useSettle } from '@/hooks/use-settle';
import { cn } from '@/lib/utils';
import type {
    AgentOption,
    ClientAgentSuggestion,
    ClientDetail,
    ClientGuarantor,
    ClientWatcher,
    ClientNote,
    ClientPriorityOption,
    DossierReadiness,
    ClientProperty,
    ClientPropertyOption,
    ClientPropertySuggestion,
    ClientProgress,
    ClientTotals,
    LeadDocumentRequest,
    LeadInvoice,
    LeadPartnerLink,
    LeadQuote,
    PartnerOption,
    PartnerRoleOption,
    TenantProfile,
    TenantSlot,
    Visit,
} from '@/types';
type Props = {
    client: ClientDetail;
    priorities: ClientPriorityOption[];
    /** Où en est le dossier de location : la mesure qui dit s'il est présentable. */
    readiness?: DossierReadiness;
    /** Totaux par devise, lus par la facturation du dossier. */
    totals?: ClientTotals[];
    /** Où en est la recherche : visites faites, biens écartés par le client. */
    progress?: ClientProgress;
    invoices: LeadInvoice[];
    quotes: LeadQuote[];
    documentRequests: LeadDocumentRequest[];
    partners: LeadPartnerLink[];
    /** Annuaires du dossier : agents, partenaires et rôles possibles. */
    agents?: AgentOption[];
    partnerOptions?: PartnerOption[];
    partnerRoles?: PartnerRoleOption[];
    /** Biens rattachés au dossier, et biens de l'annuaire encore liables. */
    properties?: ClientProperty[];
    propertyOptions?: ClientPropertyOption[];
    suggestedProperties?: ClientPropertySuggestion[];
    /** Agences (et agents) à contacter pour ce dossier, du score à points. */
    suggestedAgents?: ClientAgentSuggestion[];
    notes: ClientNote[];
    /** Visites du client, les plus récentes en premier. */
    visits?: Visit[];
    /** Journal : les 10 dernières actions du backoffice sur ce dossier. */
    /** Garants du dossier, repris des listes de documents. */
    guarantors?: ClientGuarantor[];
    /** Personnes en copie des e-mails du dossier. */
    watchers?: ClientWatcher[];
    /** Détails des locataires du dossier, par emplacement. */
    tenantProfiles?: Partial<Record<TenantSlot, TenantProfile>>;
    residencyStatuses?: { value: string; label: string }[];
    employmentStatuses?: { value: string; label: string }[];
};
function Stat({
    label,
    value,
    hint,
    children,
}: {
    label: string;
    value?: string;
    /** Ce que le chiffre compte au juste, quand l'intitulé peut se lire de travers. */
    hint?: string;
    /** Contenu libre à la place du chiffre (barre d'avancement, badge…). */
    children?: ReactNode;
}) {
    return (
        <div className="grid gap-1 px-4 py-3 first:pl-0 last:pr-0 max-sm:border-b max-sm:px-0 max-sm:last:border-b-0 sm:border-l sm:first:border-l-0">
            <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
                {label}
                {hint && (
                    /* Son propre fournisseur : la carte doit se suffire, même
                       rendue hors de l'enveloppe de l'application. */
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={`${label} : ${hint}`}
                                    className="hover:text-foreground transition-colors"
                                >
                                    <Info className="size-3.5" aria-hidden />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-64">
                                {hint}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </p>
            {children ?? (
                <p className="text-xl font-semibold tabular-nums">{value}</p>
            )}
        </div>
    );
}
function Tab({
    value,
    label,
    count,
}: {
    value: string;
    label: string;
    count?: number;
}) {
    // Un compteur qui change se signale : sans cela, une visite ajoutée par
    // un collègue ne se voyait nulle part.
    const settling = useSettle(count);
    return (
        <TabsTrigger value={value} className="flex-none px-3">
            {label}
            {/* À partir de 1 : un zéro n'apprend rien et charge l'onglet. */}
            {count !== undefined && count > 0 && (
                <Badge
                    variant="secondary"
                    className={cn(
                        'font-medium tabular-nums',
                        settling && 'animate-settle motion-reduce:animate-none',
                    )}
                    aria-label={`${count} ${count > 1 ? 'éléments' : 'élément'}`}
                >
                    {count}
                </Badge>
            )}
        </TabsTrigger>
    );
}
export default function ClientShow({
    client,
    priorities,
    readiness = {
        status: 'not_started',
        status_label: 'Pas commencé',
        total: 0,
        accepted: 0,
        to_check: 0,
        refused: 0,
        missing: 0,
        percent: 0,
    },
    invoices,
    quotes,
    documentRequests,
    partners,
    agents = [],
    partnerOptions = [],
    partnerRoles = [],
    properties = [],
    visits = [],
    propertyOptions = [],
    suggestedProperties = [],
    suggestedAgents = [],
    notes,
    guarantors = [],
    watchers = [],
    tenantProfiles = {},
    residencyStatuses = [],
    employmentStatuses = [],
    progress = { visits_done: 0, properties_refused: 0, applications: 0 },
}: Props) {
    const { staff } = usePage().props;
    // Les notes du dossier passent par les routes du lead : c'est le même
    // enregistrement, et le même fil que la fiche lead.
    const noteForm = useForm({ body: '' });
    // Les notes de l'équipe et le suivi se lisent séparément, ici comme sur
    // la fiche lead.
    const [noteFilter, setNoteFilter] = useState<ActivityFilter>('all');
    // Onglets pilotés : le bouton principal et « Voir les pièces » ouvrent
    // l'onglet Documents sans que l'utilisateur le cherche.
    const [tab, setTab] = useState('apercu');
    // Ce qui retient le dossier, en tête de l'aperçu.
    const attention = dossierAttention({
        visits,
        properties,
        suggestions: suggestedProperties,
        readiness,
        visitPath: (visit) => visitShow({ visit: visit.uuid }).url,
    });
    const submitNote = (onDone?: () => void) => {
        noteForm.post(storeNote({ lead: client.uuid }).url, {
            preserveScroll: true,
            onSuccess: () => {
                noteForm.reset();
                onDone?.();
            },
        });
    };
    const composer = (onDone?: () => void) => (
        <LeadNoteComposer
            value={noteForm.data.body}
            onChange={(value) => noteForm.setData('body', value)}
            onSubmit={() => submitNote(onDone)}
            processing={noteForm.processing}
            error={noteForm.errors.body}
            candidates={staff.map((member) => ({
                id: member.id,
                name: member.name,
            }))}
        />
    );
    // Onglet « Personnes » : locataires, garants et membres du suivi.
    const peopleCount =
        1 +
        (client.co_tenant ? 1 : 0) +
        guarantors.length +
        (client.assignee ? 1 : 0) +
        (client.co_assignee ? 1 : 0);
    const money = (cents: number, currency: string) =>
        formatMoney(cents, currency);
    const closed = client.closed_at !== null;
    return (
        <>
            <Head title={`Dossier ${client.name}`} />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8">
                    <div className="grid gap-1">
                        <div className="group flex flex-wrap items-center gap-3">
                            {/* Chemise miniature (maquette Figma « Folder Card ») : ses pages sortent au survol de l'en-tête. */}
                            <div
                                className="h-7 w-9 shrink-0"
                                data-testid="dossier-folder"
                            >
                                <FolderIllustration className="origin-top-left scale-[0.2]" />
                            </div>
                            <h1 className="text-lg font-medium">
                                {client.name}
                            </h1>
                            {/* La formule garde sa couleur partout : bleu
                                Confié, jaune Accompagné. */}
                            <OfferBadge
                                offer={client.offer}
                                label={client.offer_label}
                            />
                            <ClientPriorityMenu
                                uuid={client.uuid}
                                priority={client.priority}
                                priorities={priorities}
                            />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {client.reference}
                            {client.company && ` · ${client.company}`}
                            {client.converted_at &&
                                ` · client depuis le ${formatDate(client.converted_at.slice(0, 10))}`}
                            {' · '}
                            {/* Le suivi se change là où on le lit. */}
                            <span className="inline-flex items-center gap-1.5 align-middle">
                                suivi par
                                <ClientAssigneeMenu
                                    clientUuid={client.uuid}
                                    clientName={client.name}
                                    assignee={client.assignee}
                                />
                            </span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Un dossier clôturé se lit et se rouvre ; il ne se
                            modifie plus. */}
                        {closed ? (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.post(
                                        reopenClient({ lead: client.uuid }).url,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <ArchiveRestore aria-hidden />
                                Rouvrir le dossier
                            </Button>
                        ) : null}
                        {/* Les notes et le suivi, dans le même volet que la
                            fiche lead : filtres, fil, saisie en bas. */}
                        <LeadActivitySheet
                            count={notes.length}
                            className="w-auto"
                            filters={
                                <ActivityFilterBar
                                    value={noteFilter}
                                    onChange={setNoteFilter}
                                />
                            }
                            composer={composer()}
                        >
                            <LeadActivity
                                leadUuid={client.uuid}
                                notes={notes}
                                history={[]}
                                staffNames={staff.map((member) => member.name)}
                                filter={noteFilter}
                                className="max-h-none"
                            />
                        </LeadActivitySheet>
                        {/* Actions secondaires du dossier, derrière le menu « ⋯ ». */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Plus d’actions"
                                >
                                    <MoreHorizontal aria-hidden />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {/* Le dossier se modifie chez lui : sa propre
                                    page, sans passer par la fiche lead. */}
                                {!closed && (
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href={clientEdit({
                                                lead: client.uuid,
                                            })}
                                        >
                                            <Pencil />
                                            Modifier
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={leadShow({ lead: client.uuid })}
                                    >
                                        <ExternalLink />
                                        Fiche lead
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={visitCreate({
                                            query: { client: client.uuid },
                                        })}
                                    >
                                        <CalendarClock />
                                        Planifier une visite
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={quoteCreate({
                                            query: { lead: client.uuid },
                                        })}
                                    >
                                        <FileSignature />
                                        Nouveau devis
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={invoiceCreate({
                                            query: { lead: client.uuid },
                                        })}
                                    >
                                        <FilePlus2 />
                                        Nouvelle facture
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <section
                    aria-label="Chiffres du dossier"
                    className="grid grid-cols-1 rounded-xl border px-4 sm:grid-cols-3"
                >
                    <Stat label="Arrivée">
                        {client.arrival_at ? (
                            // Même barre d'avancement que la liste des dossiers.
                            <ArrivalProgress
                                convertedAt={client.converted_at}
                                arrivalAt={client.arrival_at}
                            />
                        ) : (
                            <p className="text-xl font-semibold tabular-nums">
                                —
                            </p>
                        )}
                    </Stat>
                    {/* Où en est la recherche, plutôt que la facturation :
                        elle a ses propres sections. */}
                    <Stat
                        label="Visites réalisées"
                        value={String(progress.visits_done)}
                    />
                    <Stat
                        label="Biens refusés"
                        hint="Les logements que le client a écartés lui-même. Une candidature refusée par l’agence ou le propriétaire n’est pas comptée ici."
                        value={String(progress.properties_refused)}
                    />
                </section>
                {closed && (
                    <div
                        role="note"
                        aria-label="Dossier clôturé"
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                    >
                        <Archive className="size-4 shrink-0" aria-hidden />
                        <span>
                            <span className="font-medium">Dossier clôturé</span>
                            {client.closed_at &&
                                ` le ${formatDate(client.closed_at.slice(0, 10))}`}
                            {client.closing_reason_label &&
                                ` · ${client.closing_reason_label}`}
                            {client.closing_note && ` — ${client.closing_note}`}
                        </span>
                    </div>
                )}
                <Tabs value={tab} onValueChange={setTab} className="gap-6">
                    <TabsList
                        variant="line"
                        className="w-full justify-start border-b"
                    >
                        <Tab value="apercu" label="Aperçu" />
                        <Tab
                            value="personnes"
                            label="Personnes"
                            count={peopleCount}
                        />
                        <Tab
                            value="visites"
                            label="Visites"
                            count={visits.length}
                        />
                        <Tab
                            value="documents"
                            label="Documents"
                            count={documentRequests.length}
                        />
                        {/* Un seul compteur : les biens du dossier. Les
                            suggestions se voient dans l'onglet. */}
                        <Tab
                            value="biens"
                            label="Biens"
                            count={properties.length}
                        />
                        {/* Les mêmes onglets que la fiche lead : « Autre »
                            disait seulement qu'on ne savait pas où ranger. */}
                        <Tab
                            value="commercial"
                            label="Commercial"
                            count={quotes.length + invoices.length}
                        />
                        <Tab
                            value="partenaires"
                            label="Partenaires"
                            count={partners.length}
                        />
                    </TabsList>
                    {/* Les deux blocs côte à côte sur grand écran : ils tiennent
                        chacun dans une demi-largeur, sans faire défiler. */}
                    <TabsContent value="apercu" className="grid gap-4">
                        <ClientOverview
                            client={client}
                            attention={attention}
                            readiness={readiness}
                            onOpenTab={setTab}
                            money={money}
                        />
                    </TabsContent>
                    <TabsContent value="personnes">
                        <ClientPeople
                            client={client}
                            guarantors={guarantors}
                            watchers={watchers}
                            tenantProfiles={tenantProfiles}
                            residencyStatuses={residencyStatuses}
                            employmentStatuses={employmentStatuses}
                        />
                    </TabsContent>
                    <TabsContent value="visites">
                        <DetailSection title="Visites">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-muted-foreground text-sm">
                                    Les visites de biens planifiées pour ce
                                    client.
                                </p>
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={visitCreate({
                                            query: { client: client.uuid },
                                        })}
                                    >
                                        <CalendarClock />
                                        Planifier une visite
                                    </Link>
                                </Button>
                            </div>
                            {visits.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucune visite pour ce client.
                                </p>
                            ) : (
                                <div className="grid gap-6">
                                    {groupVisitsByDay(visits).map((day) => (
                                        <VisitDaySection
                                            key={day.key}
                                            day={day}
                                        />
                                    ))}
                                </div>
                            )}
                        </DetailSection>
                    </TabsContent>
                    <TabsContent value="documents">
                        <DetailSection title="Documents">
                            <LeadDocumentRequests
                                leadUuid={client.uuid}
                                requests={documentRequests}
                            />
                        </DetailSection>
                    </TabsContent>
                    <TabsContent value="biens">
                        <DetailSection title="Logement du client">
                            <ClientProperties
                                clientUuid={client.uuid}
                                properties={properties}
                                options={propertyOptions}
                                suggestions={suggestedProperties}
                            />
                        </DetailSection>
                    </TabsContent>
                    <TabsContent value="commercial" className="grid gap-4">
                        <DetailSection title="Devis">
                            <LeadQuotes
                                leadUuid={client.uuid}
                                quotes={quotes}
                                canEdit
                            />
                        </DetailSection>
                        <DetailSection title="Factures">
                            <LeadInvoices
                                leadId={client.id}
                                leadUuid={client.uuid}
                                invoices={invoices}
                                canEdit
                            />
                        </DetailSection>
                    </TabsContent>
                    <TabsContent value="partenaires" className="grid gap-4">
                        {/* Le dossier se gère ici : agent immobilier et
                            partenaires s'ajoutent sans repasser par la fiche
                            lead — mêmes cartes, mêmes routes. */}
                        <ClientAgencyMatches
                            clientUuid={client.uuid}
                            currentAgentId={client.agent?.id ?? null}
                            districts={client.districts}
                            suggestions={suggestedAgents}
                        />
                        <LeadAgentCard lead={client} agents={agents} />
                        <LeadPartnersCard
                            lead={client}
                            links={partners}
                            partners={partnerOptions}
                            roles={partnerRoles}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
ClientShow.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Dossiers', href: clientsIndex() },
        { title: 'Dossier', href: '#' },
    ],
};
