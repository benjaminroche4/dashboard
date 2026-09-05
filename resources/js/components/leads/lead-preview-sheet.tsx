import { Link, router, useForm } from '@inertiajs/react';
import { ExternalLink, Mail, Pencil, Phone, Star } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { LeadAssignMenu } from '@/components/leads/lead-assign-menu';
import { LeadStatusMenu } from '@/components/leads/lead-status-menu';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    edit as leadEdit,
    preview as leadPreview,
    show as leadShow,
} from '@/routes/leads';
import { store as storeNote } from '@/routes/leads/notes';
import type { LeadPreviewPayload, LeadStatusOption } from '@/types';

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

/** Charge l'aperçu d'un lead ; `null` tant que rien n'est chargé. */
export async function fetchLeadPreview(
    id: number,
    signal?: AbortSignal,
): Promise<LeadPreviewPayload | null> {
    const response = await fetch(leadPreview({ lead: id }).url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal,
    });

    return response.ok ? ((await response.json()) as LeadPreviewPayload) : null;
}

/**
 * Volet d'aperçu d'un lead, ouvert depuis une carte du kanban : fiche
 * résumée, notes et historique, sans quitter le tableau.
 */
export function LeadPreviewSheet({
    leadId,
    statuses,
    onOpenChange,
}: {
    leadId: number | null;
    statuses: LeadStatusOption[];
    onOpenChange: (open: boolean) => void;
}) {
    const [data, setData] = useState<LeadPreviewPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const noteForm = useForm({ body: '' });

    useEffect(() => {
        if (leadId === null) {
            setData(null);

            return;
        }

        const controller = new AbortController();
        setLoading(true);
        fetchLeadPreview(leadId, controller.signal)
            .then((payload) => setData(payload))
            .catch(() => undefined)
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [leadId, reloadKey]);

    // Les changements faits depuis le volet (statut, note, attribution) rechargent l'aperçu.
    useEffect(() => {
        return router.on('success', () => setReloadKey((key) => key + 1));
    }, []);

    const submitNote = (event: FormEvent) => {
        event.preventDefault();

        if (leadId === null) {
            return;
        }

        noteForm.post(storeNote({ lead: leadId }).url, {
            preserveScroll: true,
            onSuccess: () => noteForm.reset(),
        });
    };

    const lead = data?.lead;
    const budget =
        lead && lead.budget_cents !== null
            ? formatMoney(lead.budget_cents, lead.currency)
            : null;

    return (
        <Sheet open={leadId !== null} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg"
            >
                {lead ? (
                    <>
                        <SheetHeader className="gap-3 border-b">
                            <div className="flex items-start justify-between gap-3 pr-6">
                                <div className="min-w-0">
                                    <SheetTitle className="truncate">
                                        {lead.name}
                                    </SheetTitle>
                                    <SheetDescription>
                                        {lead.offer_label ?? 'Offre à définir'}
                                        {budget ? ` · ${budget} / mois` : ''}
                                    </SheetDescription>
                                </div>
                                <LeadAssignMenu lead={lead} size="md" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
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
                                <div className="ml-auto flex items-center gap-1">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link
                                            href={leadEdit({ lead: lead.id })}
                                        >
                                            <Pencil />
                                            Modifier
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={leadShow({ lead: lead.id })}
                                        >
                                            <ExternalLink />
                                            Fiche complète
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="grid gap-6 p-4 text-sm">
                            <section className="grid gap-2">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Contact
                                </h3>
                                <ul role="list" className="grid gap-1.5">
                                    <li className="flex items-center gap-2">
                                        <Mail
                                            className="text-muted-foreground size-4"
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

                            <section className="grid gap-2">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Projet
                                </h3>
                                <dl className="bg-muted/50 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border p-3 text-xs">
                                    {[
                                        [
                                            'Arrivée',
                                            lead.arrival_at
                                                ? formatDate(lead.arrival_at)
                                                : '—',
                                        ],
                                        ['Ville', lead.origin_city ?? '—'],
                                        ['Source', lead.source_label],
                                        [
                                            'Dernier contact',
                                            lead.last_contacted_at
                                                ? dateTime.format(
                                                      new Date(
                                                          lead.last_contacted_at,
                                                      ),
                                                  )
                                                : 'Jamais',
                                        ],
                                    ].map(([label, value]) => (
                                        <div key={label} className="contents">
                                            <dt className="text-muted-foreground">
                                                {label}
                                            </dt>
                                            <dd className="truncate text-right">
                                                {value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                                {lead.message && (
                                    <p className="whitespace-pre-line">
                                        {lead.message}
                                    </p>
                                )}
                            </section>

                            <section className="grid gap-2">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Notes
                                </h3>
                                <form
                                    onSubmit={submitNote}
                                    className="grid gap-2"
                                >
                                    <Label
                                        htmlFor="preview-note"
                                        className="sr-only"
                                    >
                                        Nouvelle note
                                    </Label>
                                    <Textarea
                                        id="preview-note"
                                        rows={2}
                                        placeholder="Ajouter une note…"
                                        className="bg-background"
                                        value={noteForm.data.body}
                                        onChange={(event) =>
                                            noteForm.setData(
                                                'body',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={noteForm.errors.body}
                                    />
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
                                            Ajouter
                                        </Button>
                                    </div>
                                </form>
                                {data.notes.length === 0 ? (
                                    <p className="text-muted-foreground text-xs">
                                        Aucune note.
                                    </p>
                                ) : (
                                    <ul role="list" className="grid gap-2">
                                        {data.notes.map((note) => (
                                            <li
                                                key={note.id}
                                                className="bg-sidebar grid gap-1 rounded-md border p-2.5"
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

                            <section className="grid gap-2">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Historique
                                </h3>
                                <ol
                                    role="list"
                                    className="grid gap-1.5 text-xs"
                                >
                                    {data.history.map((change) => (
                                        <li
                                            key={change.id}
                                            className="flex justify-between gap-3"
                                        >
                                            <span>
                                                <span className="font-medium">
                                                    {change.to}
                                                </span>
                                                {change.from && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        (depuis {change.from})
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-muted-foreground shrink-0">
                                                {dateTime.format(
                                                    new Date(change.at),
                                                )}
                                                {change.by
                                                    ? ` · ${change.by}`
                                                    : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </div>
                    </>
                ) : (
                    <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 p-8 text-sm">
                        {loading ? (
                            <>
                                <Spinner />
                                Chargement…
                            </>
                        ) : (
                            'Impossible de charger ce lead.'
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
