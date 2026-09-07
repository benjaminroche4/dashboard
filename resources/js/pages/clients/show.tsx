import { Head, Link } from '@inertiajs/react';
import { Contact, ExternalLink, FilePlus2, FileSignature } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { LeadDocumentRequests } from '@/components/leads/lead-document-requests';
import { LeadInvoices } from '@/components/leads/lead-invoices';
import { LeadQuotes } from '@/components/leads/lead-quotes';
import { Panel } from '@/components/panel';
import { PartnerTypeBadge } from '@/components/partners/columns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import { formatDate, formatMoney } from '@/lib/format';
import { index as clientsIndex } from '@/routes/clients';
import { create as invoiceCreate } from '@/routes/invoices';
import { show as leadShow } from '@/routes/leads';
import { create as quoteCreate } from '@/routes/tools/quotes';
import type {
    ClientDetail,
    ClientNote,
    ClientTotals,
    LeadDocumentRequest,
    LeadInvoice,
    LeadPartnerLink,
    LeadQuote,
} from '@/types';

type Props = {
    client: ClientDetail;
    totals: ClientTotals[];
    invoices: LeadInvoice[];
    quotes: LeadQuote[];
    documentRequests: LeadDocumentRequest[];
    partners: LeadPartnerLink[];
    notes: ClientNote[];
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

/** Une valeur absente : une seule formulation, en gris. */
function Fact({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="grid gap-0.5">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-sm font-medium">
                {value ?? (
                    <span className="text-muted-foreground font-normal">
                        Non renseigné
                    </span>
                )}
            </dd>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-sidebar grid gap-1 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
                {label}
            </p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
    );
}

export default function ClientShow({
    client,
    totals,
    invoices,
    quotes,
    documentRequests,
    partners,
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
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-lg font-medium">
                                {client.name}
                            </h1>
                            <Badge variant="secondary">Client</Badge>
                            {client.offer_label && (
                                <Badge variant="outline">
                                    {client.offer_label}
                                </Badge>
                            )}
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
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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

                <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="grid content-start gap-8">
                        <Panel title="Coordonnées">
                            <dl className="grid gap-4 sm:grid-cols-2">
                                <Fact label="E-mail" value={client.email} />
                                <Fact label="Téléphone" value={client.phone} />
                                <Fact label="Société" value={client.company} />
                                <Fact
                                    label="Langue"
                                    value={client.language_label}
                                />
                                <Fact
                                    label="Ville d'origine"
                                    value={client.origin_city}
                                />
                            </dl>
                        </Panel>

                        <Panel title="Projet de logement">
                            <dl className="grid gap-4 sm:grid-cols-2">
                                <Fact
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
                                    label="Type de bien"
                                    value={
                                        client.property_types.length > 0
                                            ? client.property_types.join(', ')
                                            : null
                                    }
                                />
                                <Fact
                                    label="Durée"
                                    value={client.duration_label}
                                />
                                <Fact
                                    label="Meublé"
                                    value={client.furnished_label}
                                />
                                <Fact
                                    label="Garants"
                                    value={client.guarantor_label}
                                />
                            </dl>
                            {client.message && (
                                <p className="text-muted-foreground mt-4 text-sm whitespace-pre-line">
                                    {client.message}
                                </p>
                            )}
                        </Panel>

                        <Panel title="Devis">
                            <LeadQuotes
                                leadUuid={client.uuid}
                                quotes={quotes}
                                canEdit
                            />
                        </Panel>

                        <Panel title="Factures">
                            <LeadInvoices
                                leadId={client.id}
                                leadUuid={client.uuid}
                                invoices={invoices}
                                canEdit
                            />
                        </Panel>

                        <Panel title="Documents">
                            <LeadDocumentRequests
                                leadUuid={client.uuid}
                                requests={documentRequests}
                            />
                        </Panel>
                    </div>

                    <aside className="grid content-start gap-8">
                        <Panel
                            title="Partenaires du dossier"
                            description="Garantie, assurance, déménagement… gérés depuis la fiche lead."
                        >
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
                        </Panel>

                        <Panel
                            title="Notes"
                            description="Les dernières notes de l'équipe sur ce dossier."
                        >
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
                        </Panel>
                    </aside>
                </div>
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
