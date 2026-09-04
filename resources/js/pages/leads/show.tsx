import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, Pencil, Phone, Star } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatMoney } from '@/lib/format';
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

const dotClasses: Record<LeadStatusChange['to_status'], string> = {
    todo: 'bg-purple-500',
    in_progress: 'bg-sky-500',
    quote_sent: 'bg-amber-500',
    converted: 'bg-green-500',
    archived: 'bg-neutral-400',
};

export default function LeadsShow({ lead, notes, history, statuses }: Props) {
    const noteForm = useForm({ body: '' });

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
    const facts: { label: string; value: string }[] = [
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
        },
        { label: "Ville d'origine", value: lead.origin_city ?? 'Non précisée' },
        { label: 'Source', value: lead.source_label },
        {
            label: 'Dernier contact',
            value: lead.last_contacted_at
                ? dateTime.format(new Date(lead.last_contacted_at))
                : 'Jamais',
        },
    ];

    return (
        <>
            <Head title={`Lead ${lead.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-lg font-medium">{lead.name}</h1>
                            <LeadStatusMenu lead={lead} statuses={statuses} />
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
                                            'size-4',
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
                            Ajouté le{' '}
                            {lead.created_at
                                ? formatDate(lead.created_at.slice(0, 10))
                                : '—'}
                            {lead.created_by ? ` par ${lead.created_by}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" asChild>
                            <Link href={leadsIndex()}>Retour au kanban</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={leadEdit({ lead: lead.id })}>
                                <Pencil />
                                Modifier
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="grid content-start gap-8">
                        <section className="grid gap-3">
                            <h2 className="text-base font-medium">Contact</h2>
                            <ul role="list" className="grid gap-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Mail
                                        className="text-muted-foreground size-4"
                                        aria-hidden
                                    />
                                    {lead.email ? (
                                        <a
                                            href={`mailto:${lead.email}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {lead.email}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Pas d'e-mail
                                        </span>
                                    )}
                                </li>
                                <li className="flex items-center gap-2">
                                    <Phone
                                        className="text-muted-foreground size-4"
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
                        </section>

                        <Separator />

                        <section className="grid gap-3">
                            <h2 className="text-base font-medium">Projet</h2>
                            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                                {facts.map((fact) => (
                                    <div key={fact.label}>
                                        <dt className="text-muted-foreground text-xs">
                                            {fact.label}
                                        </dt>
                                        <dd className="font-medium">
                                            {fact.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        <Separator />

                        <section className="grid gap-3">
                            <h2 className="text-base font-medium">Message</h2>
                            {lead.message ? (
                                <p className="text-sm whitespace-pre-line">
                                    {lead.message}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun message.
                                </p>
                            )}
                        </section>
                    </div>

                    <aside className="grid content-start gap-8">
                        <section className="grid gap-3">
                            <h2 className="text-base font-medium">Notes</h2>
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
                                <p className="text-muted-foreground text-sm">
                                    Aucune note pour le moment.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-3">
                                    {notes.map((note) => (
                                        <li
                                            key={note.id}
                                            className="bg-sidebar grid gap-1 rounded-lg border p-3 text-sm"
                                        >
                                            <p className="whitespace-pre-line">
                                                {note.body}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {note.by ?? 'Staff'}
                                                {note.at
                                                    ? ` · ${dateTime.format(new Date(note.at))}`
                                                    : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="grid gap-3">
                            <h2 className="text-base font-medium">
                                Historique
                            </h2>
                            <ol
                                role="list"
                                className="before:bg-border relative grid gap-4 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px"
                            >
                                {history.map((change) => (
                                    <li
                                        key={change.id}
                                        className="relative flex gap-4 pl-6 text-sm"
                                    >
                                        <span
                                            className={cn(
                                                'ring-background absolute top-1 left-0 size-4 rounded-full ring-4',
                                                dotClasses[change.to_status],
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
                        </section>
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
