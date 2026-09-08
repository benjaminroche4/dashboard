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
    Phone,
    ShieldCheck,
    Sofa,
    Wallet,
} from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { ClientPriorityMenu } from '@/components/clients/client-priority';
import { ClientProperties } from '@/components/clients/client-properties';
import { CreatedBy } from '@/components/created-by';
import { FolderIllustration } from '@/components/folder-card';
import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadQuotes } from '@/components/leads/lead-quotes';
import { PartnerTypeBadge } from '@/components/partners/columns';
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
import { cn } from '@/lib/utils';
import { show as leadShow } from '@/routes/leads';
import { index as activityIndex } from '@/routes/tools/activity';
import { create as quoteCreate } from '@/routes/tools/quotes';
import type {
    Activity,
    ClientDetail,
    ClientNote,
    ClientPriorityOption,
    ClientProperty,
    ClientPropertyOption,
    ClientPropertySuggestion,
    ClientTotals,
    LeadDocumentRequest,
    LeadInvoice,
    LeadPartnerLink,
    LeadQuote,
    Visit,
} from '@/types';

type Props = {
    client: ClientDetail;
    priorities: ClientPriorityOption[];
    totals: ClientTotals[];
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
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
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

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 px-4 py-3 first:pl-0 last:pr-0 max-sm:border-b max-sm:px-0 max-sm:last:border-b-0 sm:border-l sm:first:border-l-0">
            <p className="text-muted-foreground truncate text-sm">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
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
            {/* Compteur toujours visible, atténué à zéro. */}
            {count !== undefined && (
                <Badge
                    variant="secondary"
                    className={cn(
                        'font-medium tabular-nums',
                        count === 0 && 'text-muted-foreground',
                    )}
                    aria-label={`${count} ${count > 1 ? 'éléments' : 'élément'}`}
                >
                    {count}
                </Badge>
            )}
        </TabsTrigger>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section
            aria-label={title}
            className="grid gap-3 py-6 first:pt-0 last:pb-0"
        >
            <h2 className="text-sm font-medium">{title}</h2>
            {children}
        </section>
    );
}

export default function ClientShow({
    client,
    priorities,
    totals,
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
}: Props) {
    const initials = useInitials();
    const money = (cents: number, currency: string) =>
        formatMoney(cents, currency);
    const main = totals[0] ?? null;

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
                        <Button variant="outline" asChild>
                            <Link href={leadShow({ lead: client.uuid })}>
                                <ExternalLink />
                                Fiche lead
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link
                                href={visitCreate({
                                    query: { client: client.uuid },
                                })}
                            >
                                <CalendarClock />
                                Planifier une visite
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link
                                href={quoteCreate({
                                    query: { lead: client.uuid },
                                })}
                            >
                                <FileSignature />
                                Nouveau devis
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link
                                href={invoiceCreate({
                                    query: { lead: client.uuid },
                                })}
                            >
                                <FilePlus2 />
                                Nouvelle facture
                            </Link>
                        </Button>
                    </div>
                </div>

                <section
                    aria-label="Chiffres du dossier"
                    className="grid grid-cols-1 rounded-xl border px-4 sm:grid-cols-4"
                >
                    <Stat
                        label="Arrivée"
                        value={
                            client.arrival_at
                                ? formatDate(client.arrival_at)
                                : '—'
                        }
                    />
                    <Stat
                        label="Facturé"
                        value={
                            main
                                ? money(main.invoiced_cents, main.currency)
                                : '—'
                        }
                    />
                    <Stat
                        label="Encaissé"
                        value={
                            main ? money(main.paid_cents, main.currency) : '—'
                        }
                    />
                    <Stat
                        label="Reste dû"
                        value={
                            main ? money(main.due_cents, main.currency) : '—'
                        }
                    />
                </section>
                {totals.length > 1 && (
                    <p className="text-muted-foreground -mt-4 text-sm">
                        Autres devises :{' '}
                        {totals
                            .slice(1)
                            .map(
                                (total) =>
                                    `${money(total.invoiced_cents, total.currency)} facturés, ${money(total.paid_cents, total.currency)} encaissés`,
                            )
                            .join(' · ')}
                        .
                    </p>
                )}

                <Tabs defaultValue="apercu" className="gap-6">
                    <TabsList
                        variant="line"
                        className="w-full justify-start border-b"
                    >
                        <Tab value="apercu" label="Aperçu" />
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
                    <TabsContent value="apercu" className="divide-y">
                        <Section title="Coordonnées">
                            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        </Section>
                        <Section title="Projet de logement">
                            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        </Section>
                    </TabsContent>
                    <TabsContent value="visites">
                        <Section title="Visites">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-muted-foreground -mt-2 text-sm">
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
                        </Section>
                    </TabsContent>
                    <TabsContent value="documents">
                        <Section title="Documents">
                            <LeadDocumentRequests
                                leadUuid={client.uuid}
                                requests={documentRequests}
                            />
                        </Section>
                    </TabsContent>
                    <TabsContent value="biens">
                        <Section title="Biens du dossier">
                            <ClientProperties
                                clientUuid={client.uuid}
                                properties={properties}
                                options={propertyOptions}
                                suggestions={suggestedProperties}
                            />
                        </Section>
                    </TabsContent>
                    <TabsContent value="notes" className="divide-y">
                        <Section title="Notes">
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
                        </Section>
                        <Section title="Journal">
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
                        </Section>
                    </TabsContent>
                    <TabsContent value="autre" className="divide-y">
                        <Section title="Devis">
                            <LeadQuotes
                                leadUuid={client.uuid}
                                quotes={quotes}
                                canEdit
                            />
                        </Section>
                        <Section title="Factures">
                            <LeadInvoices
                                leadId={client.id}
                                leadUuid={client.uuid}
                                invoices={invoices}
                                canEdit
                            />
                        </Section>
                        <Section title="Partenaires du dossier">
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
                        </Section>
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
