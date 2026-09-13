import { parisFormat } from '@/lib/datetime';
import { Head, Link } from '@inertiajs/react';
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
    Languages,
    Mail,
    MapPin,
    MoreHorizontal,
    Phone,
    ShieldCheck,
    Sofa,
    Wallet,
} from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { ClientPriorityMenu } from '@/components/clients/client-priority';
import { ArrivalProgress } from '@/components/clients/arrival-progress';
import { ClientPeople } from '@/components/clients/client-people';
import { ClientProperties } from '@/components/clients/client-properties';
import { DossierReadinessCard } from '@/components/clients/dossier-readiness';
import { CreatedBy } from '@/components/created-by';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderIllustration } from '@/components/folder-card';
import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadQuotes } from '@/components/leads/lead-quotes';
import { PartnerTypeBadge } from '@/components/partners/columns';
import { DetailSection } from '@/components/real-estate/detail-header';
import { VisitDaySection } from '@/components/visits/visit-day-section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInitials } from '@/hooks/use-initials';
import { formatDate, formatMoney } from '@/lib/format';
import { groupVisitsByDay } from '@/lib/visits';
import { index as clientsIndex } from '@/routes/clients';
import { create as invoiceCreate } from '@/routes/invoices';
import { create as visitCreate } from '@/routes/clients/visits';
import { show as leadShow } from '@/routes/leads';
import { index as activityIndex } from '@/routes/tools/activity';
import { create as quoteCreate } from '@/routes/tools/quotes';
import type {
    Activity,
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
    children,
}: {
    label: string;
    value?: string;
    /** Contenu libre à la place du chiffre (barre d'avancement, badge…). */
    children?: ReactNode;
}) {
    return (
        <div className="grid gap-1 px-4 py-3 first:pl-0 last:pr-0 max-sm:border-b max-sm:px-0 max-sm:last:border-b-0 sm:border-l sm:first:border-l-0">
            <p className="text-muted-foreground truncate text-sm">{label}</p>
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
    const initials = useInitials();
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
                            {client.offer_label && (
                                <Badge variant="outline">
                                    {client.offer_label}
                                </Badge>
                            )}
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
                            {client.assignee ? (
                                <span className="inline-flex items-center gap-1.5 align-middle">
                                    suivi par
                                    <Avatar className="size-5">
                                        {client.assignee.avatar && (
                                            <AvatarImage
                                                src={client.assignee.avatar}
                                                alt=""
                                            />
                                        )}
                                        <AvatarFallback className="text-[10px]">
                                            {initials(client.assignee.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {client.assignee.name}
                                </span>
                            ) : (
                                'non attribué'
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                        <DetailSection title="Biens du dossier">
                            <ClientProperties
                                clientUuid={client.uuid}
                                properties={properties}
                                options={propertyOptions}
                                suggestions={suggestedProperties}
                            />
                        </DetailSection>
                    </TabsContent>
                    <TabsContent value="notes" className="grid gap-4">
                        <DetailSection title="Notes">
                            <p className="text-muted-foreground -mt-2 text-sm">
                                Les dernières notes de l'équipe sur ce dossier.
                            </p>
                            {notes.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucune note.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-4">
                                    {notes.slice(0, 8).map((note) => (
                                        <li
                                            key={note.id}
                                            className="grid gap-1 text-sm"
                                        >
                                            <p className="whitespace-pre-line">
                                                {note.body}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                <CreatedBy
                                                    name={note.by}
                                                    avatar={note.avatar}
                                                    verb=""
                                                />
                                                {note.at &&
                                                    ` · ${dateTime.format(new Date(note.at))}`}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {notes.length > 8 && (
                                <p className="text-muted-foreground mt-3 text-xs">
                                    <Link
                                        href={leadShow({ lead: client.uuid })}
                                        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                    >
                                        <Contact
                                            className="size-3"
                                            aria-hidden
                                        />
                                        Tout le fil d'activité sur la fiche lead
                                    </Link>
                                </p>
                            )}
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
                        <DetailSection title="Partenaires du dossier">
                            <p className="text-muted-foreground -mt-2 text-sm">
                                Garantie, assurance, déménagement… gérés depuis
                                la fiche lead.
                            </p>
                            {partners.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun partenaire sur ce dossier.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-3">
                                    {partners.map((link) => (
                                        <li
                                            key={link.id}
                                            className="grid gap-1 text-sm"
                                        >
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium">
                                                    {link.partner.name}
                                                </span>
                                                <PartnerTypeBadge
                                                    type={link.partner.type}
                                                    label={
                                                        link.partner.type_label
                                                    }
                                                />
                                            </span>
                                            <span className="text-muted-foreground">
                                                {link.role_label}
                                                {link.note && ` · ${link.note}`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DetailSection>
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
