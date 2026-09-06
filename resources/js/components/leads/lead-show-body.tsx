import { Clock, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type Fact = {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    /** Petit badge après la valeur (ex. compte à rebours d'arrivée). */
    badge?: string | null;
    /** Teinte du badge. */
    badgeTone?: 'default' | 'warn' | 'good';
    multiline?: boolean;
};

/** `hint` s'affiche en badge à droite de la valeur (ex. « Dans 145 j »). */
export type Kpi = { label: string; value: ReactNode; hint?: string };

type Props = {
    contact: Fact[];
    facts: Fact[];
    message: string | null;
    qualification: Fact[];
    /** Carte des arrondissements. */
    map: ReactNode;
    /** Responsable du lead : avatar, nom et menu d'attribution. */
    assign: ReactNode;
    /** Prochain recontact : canal, date, retard, planification. */
    recontact?: ReactNode;
    /** Date du dernier contact, déjà formatée, ou « Jamais ». */
    lastContact: string;
    /** Marque le lead comme contacté maintenant. */
    onTouchContact?: () => void;
    touchingContact?: boolean;
    /** Actions vers le lead (ex. « Envoyer au lead »), sous le dernier contact. */
    actions?: ReactNode;
    /** Fil d'activité : notes, envois et statuts. */
    activity: ReactNode;
    activityCount: number;
    /** Filtres du fil, à droite du titre Activité. */
    activityFilters?: ReactNode;
    /** Zone de saisie d'une note, sous le fil. */
    composer: ReactNode;
    /** Résumé chiffré affiché en bandeau : budget, arrivée, offre, qualité. */
    kpis: Kpi[];
    /** Factures rattachées au lead, section après la qualification. */
    invoices?: ReactNode;
    documents?: ReactNode;
};

const badgeTones = {
    default: '',
    warn: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

/** Lignes libellé / valeur sur colonne fixe. */
function Rows({ facts }: { facts: Fact[] }) {
    return (
        <dl className="grid gap-3">
            {facts.map((fact) => (
                <div
                    key={fact.label}
                    className="grid gap-0.5 text-sm sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
                >
                    <dt className="text-muted-foreground flex items-center gap-1.5">
                        {fact.icon}
                        {fact.label}
                    </dt>
                    <dd
                        className={cn(
                            'min-w-0 font-medium',
                            fact.multiline ? 'whitespace-pre-line' : 'truncate',
                        )}
                    >
                        {fact.value}
                        {fact.badge && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'ml-2 align-middle font-medium tabular-nums',
                                    badgeTones[fact.badgeTone ?? 'default'],
                                )}
                            >
                                {fact.badge}
                            </Badge>
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Section sans cadre, séparée de la suivante par un filet. */
function Section({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className="grid gap-3 py-8 first:pt-0 last:pb-0"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">{title}</h2>
                {action}
            </header>
            {children}
        </section>
    );
}

/** Bandeau des chiffres clés : une carte divisée en quatre colonnes. */
function Kpis({ kpis }: { kpis: Kpi[] }) {
    return (
        <dl
            aria-label="Chiffres clés"
            className="bg-sidebar grid divide-y rounded-xl border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
        >
            {kpis.map((kpi) => (
                <div key={kpi.label} className="grid gap-1 p-4">
                    <dt className="text-muted-foreground text-xs">
                        {kpi.label}
                    </dt>
                    <dd className="flex items-center justify-between gap-2">
                        <span className="truncate text-lg font-semibold tabular-nums">
                            {kpi.value}
                        </span>
                        {kpi.hint && (
                            <Badge
                                variant="secondary"
                                className="shrink-0 font-medium tabular-nums"
                            >
                                {kpi.hint}
                            </Badge>
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Corps de la fiche lead : bandeau de chiffres clés, puis sections nues à
 * gauche et, à droite, la carte du responsable (recontact, dernier contact,
 * actions) puis la carte du fil d'activité.
 */
export function LeadShowBody({
    contact,
    facts,
    message,
    qualification,
    map,
    assign,
    recontact,
    lastContact,
    onTouchContact,
    touchingContact = false,
    actions,
    activity,
    activityCount,
    activityFilters,
    composer,
    kpis,
    invoices,
    documents,
}: Props) {
    return (
        <div className="grid gap-8">
            <Kpis kpis={kpis} />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="divide-y">
                    <Section title="Contact">
                        <Rows facts={contact} />
                    </Section>
                    <Section title="Projet">
                        <Rows facts={facts} />
                        {map}
                    </Section>
                    <Section title="Note sur le projet">
                        {message ? (
                            <p className="text-sm/6 whitespace-pre-line">
                                {message}
                            </p>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                Non renseignée
                            </p>
                        )}
                    </Section>
                    <Section title="Qualification">
                        <Rows facts={qualification} />
                    </Section>
                    {invoices && <Section title="Factures">{invoices}</Section>}
                    {documents && (
                        <Section title="Documents">{documents}</Section>
                    )}
                </div>
                <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                    <section
                        aria-label="Responsable"
                        className="bg-sidebar grid gap-3 rounded-xl border p-4"
                    >
                        <h2 className="text-base font-medium">Suivi par</h2>
                        {assign}
                        {recontact && (
                            <div className="border-t pt-3">{recontact}</div>
                        )}
                        <div className="flex items-end justify-between gap-3 border-t pt-3 text-sm">
                            <div className="grid min-w-0 gap-0.5">
                                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                    <Clock className="size-3.5" aria-hidden />
                                    Dernier contact
                                </span>
                                <span className="truncate font-medium">
                                    {lastContact}
                                </span>
                            </div>
                            {onTouchContact && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    disabled={touchingContact}
                                    onClick={onTouchContact}
                                >
                                    {touchingContact ? (
                                        <Spinner />
                                    ) : (
                                        <RefreshCw aria-hidden />
                                    )}
                                    Mettre à jour
                                </Button>
                            )}
                        </div>
                        {actions && (
                            <div className="border-t pt-3">{actions}</div>
                        )}
                    </section>
                    <section
                        aria-label="Activité"
                        className="bg-sidebar grid gap-2 rounded-xl border p-4"
                    >
                        <header className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                Activité
                                <Badge
                                    variant="secondary"
                                    className="font-medium tabular-nums"
                                    aria-label={`${activityCount} ${activityCount > 1 ? 'entrées' : 'entrée'}`}
                                >
                                    {activityCount}
                                </Badge>
                            </h2>
                            {activityFilters}
                        </header>
                        {activity}
                        {composer}
                    </section>
                </aside>
            </div>
        </div>
    );
}
