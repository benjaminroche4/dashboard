import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowLeft,
    CalendarDays,
    Clock,
    Mail,
    MapPin,
    Pencil,
    Phone,
    PlaneLanding,
    Star,
} from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import {
    LeadAssignMenu,
    initials,
    memberTone,
} from '@/components/leads/lead-assign-menu';
import {
    LeadStatusMenu,
    leadStatusDot,
} from '@/components/leads/lead-status-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatMoney } from '@/lib/format';
import { leadUrgency } from '@/lib/lead-urgency';
import { describeDistricts } from '@/lib/paris-districts';
import { cn } from '@/lib/utils';
import { edit as leadEdit, index as leadsIndex } from '@/routes/leads';
import { store as storeNote } from '@/routes/leads/notes';
import type {
    LeadDetail,
    LeadNote,
    LeadStatusChange,
    LeadStatusOption,
} from '@/types';

type Props = {
    lead: LeadDetail;
    notes: LeadNote[];
    history: LeadStatusChange[];
    statuses: LeadStatusOption[];
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function Panel({
    title,
    action,
    children,
    className,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('bg-sidebar rounded-xl border', className)}>
            <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
                <h2 className="text-sm font-medium">{title}</h2>
                {action}
            </header>
            <div className="px-4 pb-4">{children}</div>
        </section>
    );
}

export default function LeadsShow({ lead, notes, history, statuses }: Props) {
    const noteForm = useForm({ body: '' });
    const urgency = leadUrgency(lead);

    const submitNote = (event: FormEvent) => {
        event.preventDefault();
        noteForm.post(storeNote({ lead: lead.id }).url, {
            preserveScroll: true,
            onSuccess: () => noteForm.reset(),
        });
    };

    const budget =
        lead.budget_cents === null
            ? null
            : formatMoney(lead.budget_cents, lead.currency);
    const facts: { label: string; value: string; icon?: React.ReactNode }[] = [
        { label: 'Offre visée', value: lead.offer_label ?? 'Non précisée' },
        {
            label: 'Budget mensuel',
            value: budget ? `${budget} / mois` : 'Non précisé',
        },
        {
            label: "Date d'arrivée",
            value: lead.arrival_at
                ? formatDate(lead.arrival_at)
                : 'Non précisée',
            icon: <CalendarDays className="size-3.5" aria-hidden />,
        },
        {
            label: "Ville d'origine",
            value: lead.origin_city ?? 'Non précisée',
            icon: <MapPin className="size-3.5" aria-hidden />,
        },
        {
            label: 'Quartiers visés',
            value: describeDistricts(lead.districts) ?? 'Non précisés',
            icon: <MapPin className="size-3.5" aria-hidden />,
        },
        {
            label: 'Type de bien',
            value:
                lead.property_types.length > 0
                    ? lead.property_types.map((type) => type.label).join(', ')
                    : 'Non précisé',
        },
        {
            label: "Durée d'installation",
            value: lead.duration_label ?? 'À définir',
        },
        { label: 'Garant', value: lead.guarantor_label ?? 'À définir' },
        { label: 'Meublé', value: lead.furnished_label ?? 'Indifférent' },
        {
            label: 'Source',
            value: lead.source_note
                ? `${lead.source_label} · ${lead.source_note}`
                : lead.source_label,
        },
        {
            label: 'Dernier contact',
            value: lead.last_contacted_at
                ? dateTime.format(new Date(lead.last_contacted_at))
                : 'Jamais',
            icon: <Clock className="size-3.5" aria-hidden />,
        },
    ];

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
                                <LeadStatusMenu
                                    lead={lead}
                                    statuses={statuses}
                                />
                                <span
                                    className="flex items-center gap-0.5"
                                    aria-label={
                                        lead.score === null
                                            ? 'Qualité non évaluée'
                                            : `Qualité ${lead.score} sur 5`
                                    }
                                >
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <Star
                                            key={value}
                                            aria-hidden
                                            className={cn(
                                                'size-3.5',
                                                lead.score !== null &&
                                                    value <= lead.score
                                                    ? 'fill-current text-amber-500'
                                                    : 'text-muted-foreground/30',
                                            )}
                                        />
                                    ))}
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                {[lead.company, lead.language_label]
                                    .filter(Boolean)
                                    .join(' · ')}
                                {' · '}
                                {lead.offer_label ?? 'Offre à définir'}
                                {budget ? ` · ${budget} / mois` : ''}
                                {' · '}Ajouté le{' '}
                                {lead.created_at
                                    ? formatDate(lead.created_at.slice(0, 10))
                                    : '—'}
                                {lead.created_by
                                    ? ` par ${lead.created_by}`
                                    : ''}
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
                        <Button variant="ghost" asChild>
                            <Link href={leadsIndex()}>
                                <ArrowLeft />
                                Retour au kanban
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={leadEdit({ lead: lead.id })}>
                                <Pencil />
                                Modifier
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="grid content-start gap-6">
                        <Panel
                            title="Contact"
                            action={
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">
                                        Suivi par
                                    </span>
                                    <LeadAssignMenu lead={lead} size="md" />
                                </div>
                            }
                        >
                            <ul
                                role="list"
                                className="bg-background grid divide-y rounded-lg border text-sm"
                            >
                                <li className="flex items-center gap-3 px-3 py-2.5">
                                    <Mail
                                        className="text-muted-foreground size-4 shrink-0"
                                        aria-hidden
                                    />
                                    {lead.email ? (
                                        <a
                                            href={`mailto:${lead.email}`}
                                            className="truncate underline-offset-4 hover:underline"
                                        >
                                            {lead.email}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Pas d'e-mail
                                        </span>
                                    )}
                                </li>
                                <li className="flex items-center gap-3 px-3 py-2.5">
                                    <Phone
                                        className="text-muted-foreground size-4 shrink-0"
                                        aria-hidden
                                    />
                                    {lead.phone ? (
                                        <a
                                            href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {lead.phone}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Pas de téléphone
                                        </span>
                                    )}
                                </li>
                            </ul>
                        </Panel>

                        <Panel title="Projet">
                            <dl className="grid gap-2 sm:grid-cols-2">
                                {facts.map((fact) => (
                                    <div
                                        key={fact.label}
                                        className="bg-background grid gap-0.5 rounded-lg border px-3 py-2.5"
                                    >
                                        <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                            {fact.icon}
                                            {fact.label}
                                        </dt>
                                        <dd className="truncate text-sm font-medium">
                                            {fact.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </Panel>

                        <Panel title="Note sur le projet">
                            {lead.message ? (
                                <p className="bg-background rounded-lg border px-3 py-2.5 text-sm whitespace-pre-line">
                                    {lead.message}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun message.
                                </p>
                            )}
                        </Panel>
                    </div>

                    <aside className="grid content-start gap-6">
                        <Panel title="Qualification">
                            <dl className="grid gap-2">
                                <div className="bg-background grid gap-0.5 rounded-lg border px-3 py-2.5">
                                    <dt className="text-muted-foreground text-xs">
                                        Recontact
                                    </dt>
                                    <dd className="text-sm font-medium">
                                        {lead.recontact_channel_label
                                            ? `${lead.recontact_channel_label}${lead.recontact_at ? ` · le ${formatDate(lead.recontact_at)}` : ''}`
                                            : 'Aucun recontact prévu'}
                                    </dd>
                                </div>
                                <div className="bg-background grid gap-0.5 rounded-lg border px-3 py-2.5">
                                    <dt className="text-muted-foreground text-xs">
                                        Note de qualification
                                    </dt>
                                    <dd className="text-sm whitespace-pre-line">
                                        {lead.qualification_note ?? (
                                            <span className="text-muted-foreground">
                                                Aucune.
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </Panel>
                        <Panel
                            title="Notes"
                            action={
                                <span className="text-muted-foreground text-xs">
                                    {notes.length}
                                </span>
                            }
                        >
                            <form onSubmit={submitNote} className="grid gap-2">
                                <Label htmlFor="note" className="sr-only">
                                    Nouvelle note
                                </Label>
                                <Textarea
                                    id="note"
                                    rows={3}
                                    placeholder="Ajouter une note interne…"
                                    className="bg-background"
                                    value={noteForm.data.body}
                                    onChange={(event) =>
                                        noteForm.setData(
                                            'body',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={noteForm.errors.body} />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={
                                            noteForm.processing ||
                                            noteForm.data.body.trim() === ''
                                        }
                                    >
                                        {noteForm.processing && <Spinner />}
                                        Ajouter la note
                                    </Button>
                                </div>
                            </form>
                            {notes.length === 0 ? (
                                <p className="text-muted-foreground pt-3 text-sm">
                                    Aucune note pour le moment.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-2 pt-3">
                                    {notes.map((note) => (
                                        <li
                                            key={note.id}
                                            className="bg-background grid gap-1.5 rounded-lg border px-3 py-2.5 text-sm"
                                        >
                                            <p className="whitespace-pre-line">
                                                {note.body}
                                            </p>
                                            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                                <span
                                                    className={cn(
                                                        'flex size-4 items-center justify-center rounded-full text-[9px] font-medium',
                                                        'bg-muted',
                                                    )}
                                                    aria-hidden
                                                >
                                                    {initials(note.by ?? 'S')}
                                                </span>
                                                {note.by ?? 'Staff'}
                                                {note.at
                                                    ? ` · ${dateTime.format(new Date(note.at))}`
                                                    : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        <Panel title="Historique">
                            <ol
                                role="list"
                                className="before:bg-border relative grid gap-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px"
                            >
                                {history.map((change) => (
                                    <li
                                        key={change.id}
                                        className="relative flex gap-3 pl-5 text-sm"
                                    >
                                        <span
                                            className={cn(
                                                'ring-sidebar absolute top-1.5 left-0 size-3 rounded-full ring-4',
                                                leadStatusDot[change.to_status],
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p>
                                                <span className="font-medium">
                                                    {change.to}
                                                </span>
                                                {change.from && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        (depuis {change.from})
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {dateTime.format(
                                                    new Date(change.at),
                                                )}
                                                {change.by
                                                    ? ` · ${change.by}`
                                                    : ''}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </Panel>
                    </aside>
                </div>
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
