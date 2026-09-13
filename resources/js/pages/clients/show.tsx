import { parisFormat } from '@/lib/datetime';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    CalendarDays,
    Contact,
    ExternalLink,
    History,
    FilePlus2,
    FileSignature,
    Home,
    Info,
    Languages,
    Mail,
    MapPin,
    MessageSquarePlus,
    MoreHorizontal,
    Pencil,
    Phone,
    ShieldCheck,
    Sofa,
    Wallet,
} from 'lucide-react';
import {
    useState,
    type ComponentType,
    type ReactNode,
    type SVGProps,
} from 'react';
import { ClientAssigneeMenu } from '@/components/clients/client-assignee-menu';
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
import { DossierReadinessCard } from '@/components/clients/dossier-readiness';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { DetailSection } from '@/components/real-estate/detail-header';
import { VisitDaySection } from '@/components/visits/visit-day-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatMoney } from '@/lib/format';
import { groupVisitsByDay } from '@/lib/visits';
import { edit as clientEdit, index as clientsIndex } from '@/routes/clients';
import { create as invoiceCreate } from '@/routes/invoices';
import { create as visitCreate } from '@/routes/clients/visits';
import { show as leadShow } from '@/routes/leads';
import { store as storeNote } from '@/routes/leads/notes';
import { index as activityIndex } from '@/routes/tools/activity';
import { create as quoteCreate } from '@/routes/tools/quotes';
import type {
    Activity,
    AgentOption,
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
    notes: ClientNote[];
    /** Visites du client, les plus récentes en premier. */
    visits?: Visit[];
    /** Journal : les 10 dernières actions du backoffice sur ce dossier. */
    activities?: Activity[];
    /** Garants du dossier, repris des listes de documents. */
    guarantors?: ClientGuarantor[];
    /** Personnes en copie des e-mails du dossier. */
    watchers?: ClientWatcher[];
    /** Détails des locataires du dossier, par emplacement. */
    tenantProfiles?: Partial<Record<TenantSlot, TenantProfile>>;
    residencyStatuses?: { value: string; label: string }[];
    employmentStatuses?: { value: string; label: string }[];
};

const dateTime = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** Une information du dossier dans une petite carte : icône, libellé, valeur. Une valeur absente : une seule formulation, en gris. */
function Fact({
    icon: Icon,
    label,
    value,
}: {
    icon: IconType;
    label: string;
    value: string | null;
}) {
    return (
        <div className="bg-sidebar flex items-start gap-3 rounded-lg border p-3">
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-4" aria-hidden />
            </span>
            <div className="grid min-w-0 gap-0.5">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="text-sm font-medium [overflow-wrap:anywhere]">
                    {value ?? (
                        <span className="text-muted-foreground font-normal">
                            Non renseigné
                        </span>
                    )}
                </dd>
            </div>
        </div>
    );
}

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
    matches,
}: {
    value: string;
    label: string;
    count?: number;
    /** Biens qui correspondent au projet : une pastille verte, à côté du compte. */
    matches?: number;
}) {
    return (
        <TabsTrigger value={value} className="flex-none px-3">
            {label}
            {/* À partir de 1 : un zéro n'apprend rien et charge l'onglet. */}
            {count !== undefined && count > 0 && (
                <Badge
                    variant="secondary"
                    className="font-medium tabular-nums"
                    aria-label={`${count} ${count > 1 ? 'éléments' : 'élément'}`}
                >
                    {count}
                </Badge>
            )}
            {/* Suggestions : elles ne sont pas rattachées au dossier, elles ne
                se comptent donc pas avec, mais elles appellent un coup d'œil. */}
            {matches !== undefined && matches > 0 && (
                <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700 tabular-nums dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    aria-label={`${matches} bien${matches > 1 ? 's' : ''} correspond${matches > 1 ? 'ent' : ''} au projet`}
                >
                    +{matches}
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
    activities = [],
    propertyOptions = [],
    suggestedProperties = [],
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
    const [noteOpen, setNoteOpen] = useState(false);
    // Les notes de l'équipe et le suivi se lisent séparément, ici comme sur
    // la fiche lead.
    const [noteFilter, setNoteFilter] = useState<ActivityFilter>('all');
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
                            <Badge variant="secondary">Client</Badge>
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
                        {/* Le dossier se modifie chez lui : sa propre page,
                            sans passer par la fiche lead. */}
                        <Button variant="outline" asChild>
                            <Link href={clientEdit({ lead: client.uuid })}>
                                <Pencil aria-hidden />
                                Modifier
                            </Link>
                        </Button>
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
                <Tabs defaultValue="apercu" className="gap-6">
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
                        <Tab
                            value="biens"
                            label="Biens"
                            count={properties.length}
                            matches={suggestedProperties.length}
                        />
                        <Tab value="notes" label="Notes" count={notes.length} />
                        <Tab
                            value="autre"
                            label="Autre"
                            count={
                                quotes.length +
                                invoices.length +
                                partners.length
                            }
                        />
                    </TabsList>
                    {/* Les deux blocs côte à côte sur grand écran : ils tiennent
                        chacun dans une demi-largeur, sans faire défiler. */}
                    <TabsContent
                        value="apercu"
                        className="grid items-start gap-4 lg:grid-cols-2"
                    >
                        {/* Une note se prend sans quitter l'aperçu : le
                            bouton ouvre le même compositeur que l'onglet
                            Notes (mentions comprises). */}
                        <div className="flex justify-end lg:col-span-2">
                            <Popover open={noteOpen} onOpenChange={setNoteOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MessageSquarePlus aria-hidden />
                                        Ajouter une note
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    className="w-[min(24rem,calc(100vw-2rem))]"
                                >
                                    {composer(() => setNoteOpen(false))}
                                </PopoverContent>
                            </Popover>
                        </div>
                        <DetailSection
                            title="Dossier de location"
                            className="lg:col-span-2"
                        >
                            <DossierReadinessCard
                                readiness={readiness}
                                leadUuid={client.uuid}
                            />
                        </DetailSection>
                        <DetailSection title="Coordonnées">
                            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Fact
                                    icon={Mail}
                                    label="E-mail"
                                    value={client.email}
                                />
                                <Fact
                                    icon={Phone}
                                    label="Téléphone"
                                    value={client.phone}
                                />
                                <Fact
                                    icon={Building2}
                                    label="Société"
                                    value={client.company}
                                />
                                <Fact
                                    icon={Languages}
                                    label="Langue"
                                    value={client.language_label}
                                />
                                <Fact
                                    icon={MapPin}
                                    label="Ville d'origine"
                                    value={client.origin_city}
                                />
                            </dl>
                        </DetailSection>
                        <DetailSection title="Projet de logement">
                            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Fact
                                    icon={Wallet}
                                    label="Budget mensuel"
                                    value={
                                        client.budget_cents === null
                                            ? null
                                            : money(
                                                  client.budget_cents,
                                                  client.currency,
                                              )
                                    }
                                />
                                <Fact
                                    icon={MapPin}
                                    label="Arrondissements"
                                    value={
                                        client.districts.length > 0
                                            ? client.districts
                                                  .map((d) => `${d}e`)
                                                  .join(', ')
                                            : null
                                    }
                                />
                                <Fact
                                    icon={Home}
                                    label="Type de bien"
                                    value={
                                        client.property_types.length > 0
                                            ? client.property_types.join(', ')
                                            : null
                                    }
                                />
                                <Fact
                                    icon={CalendarDays}
                                    label="Durée"
                                    value={client.duration_label}
                                />
                                <Fact
                                    icon={Sofa}
                                    label="Meublé"
                                    value={client.furnished_label}
                                />
                                <Fact
                                    icon={ShieldCheck}
                                    label="Garants"
                                    value={client.guarantor_label}
                                />
                            </dl>
                            {client.message && (
                                <p className="text-muted-foreground mt-4 text-sm whitespace-pre-line">
                                    {client.message}
                                </p>
                            )}
                        </DetailSection>
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
                    <TabsContent value="notes" className="grid gap-4">
                        {/* Même fil et mêmes bulles que la fiche lead : on
                            écrit ici, on relit et on corrige ici. */}
                        <DetailSection
                            title="Notes"
                            count={notes.length}
                            action={
                                <ActivityFilterBar
                                    value={noteFilter}
                                    onChange={setNoteFilter}
                                />
                            }
                        >
                            <p className="text-muted-foreground -mt-2 text-sm">
                                Ce que l’équipe s’écrit, et le suivi que
                                l’application note au fil des actions. « @ »
                                mentionne un membre.
                            </p>
                            {composer()}
                            <LeadActivity
                                leadUuid={client.uuid}
                                notes={notes}
                                history={[]}
                                staffNames={staff.map((member) => member.name)}
                                filter={noteFilter}
                                className="max-h-none"
                            />
                            <p className="text-muted-foreground text-xs">
                                <Link
                                    href={leadShow({ lead: client.uuid })}
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <Contact className="size-3" aria-hidden />
                                    Tout le fil d’activité sur la fiche lead
                                </Link>
                            </p>
                        </DetailSection>
                        <DetailSection title="Journal">
                            <p className="text-muted-foreground -mt-2 text-sm">
                                Les dernières actions de l'équipe sur ce
                                dossier.
                            </p>
                            {activities.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucune activité.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-3">
                                    {activities.map((activity) => (
                                        <li
                                            key={activity.id}
                                            className="grid gap-0.5 text-sm"
                                        >
                                            <p>
                                                <span className="font-medium">
                                                    {activity.actor?.name ??
                                                        'Le système'}
                                                </span>{' '}
                                                {activity.message}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {activity.resource_label} ·{' '}
                                                <time
                                                    dateTime={
                                                        activity.created_at
                                                    }
                                                >
                                                    {dateTime.format(
                                                        new Date(
                                                            activity.created_at,
                                                        ),
                                                    )}
                                                </time>
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="text-muted-foreground mt-1 text-xs">
                                <Link
                                    href={activityIndex({
                                        query: { lead: client.uuid },
                                    })}
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <History className="size-3" aria-hidden />
                                    Tout le journal
                                </Link>
                            </p>
                        </DetailSection>
                    </TabsContent>
                    <TabsContent value="autre" className="grid gap-4">
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
                        {/* Le dossier se gère ici : agent immobilier et
                            partenaires s'ajoutent sans repasser par la fiche
                            lead — mêmes cartes, mêmes routes. */}
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
