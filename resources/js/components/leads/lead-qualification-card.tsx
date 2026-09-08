import { router, usePage } from '@inertiajs/react';
import { Check, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { qualify as leadQualify } from '@/routes/leads';
import leadQualification from '@/routes/leads/qualification';
import type { LeadDetail, LeadQualification } from '@/types';

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Proposition de qualification de l'assistant IA : résumé du projet, note, et
 * les champs qu'il a lus (cochés par défaut). L'équipe applique ce qu'elle
 * retient ou ignore la proposition. Sans proposition, un bouton la demande.
 */
export function LeadQualificationCard({
    lead,
    qualification,
    className,
}: {
    lead: LeadDetail;
    qualification: LeadQualification | null;
    className?: string;
}) {
    // Les pages testées ne fournissent pas toujours `features` : on lit prudemment.
    const assistantEnabled = usePage().props.features?.assistant ?? false;
    const [selected, setSelected] = useState<string[]>([]);
    const [busy, setBusy] = useState<'apply' | 'dismiss' | 'qualify' | null>(
        null,
    );

    useEffect(() => {
        setSelected(qualification?.fields.map((field) => field.key) ?? []);
    }, [qualification]);

    if (!assistantEnabled && !qualification) {
        return null;
    }

    const request = (kind: 'apply' | 'dismiss' | 'qualify') => {
        setBusy(kind);
        const options = { preserveScroll: true, onFinish: () => setBusy(null) };

        if (kind === 'qualify') {
            router.post(leadQualify({ lead: lead.uuid }).url, {}, options);
        } else if (kind === 'dismiss') {
            router.delete(
                leadQualification.dismiss({ lead: lead.uuid }).url,
                options,
            );
        } else {
            router.post(
                leadQualification.apply({ lead: lead.uuid }).url,
                { fields: selected },
                options,
            );
        }
    };

    if (!qualification) {
        return (
            <section
                aria-label="Qualification par l’assistant"
                className={cn(
                    'bg-sidebar flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4',
                    className,
                )}
            >
                <div className="grid gap-0.5">
                    <h2 className="flex items-center gap-2 text-base font-medium">
                        Qualifier avec l’assistant
                        <AiBadge />
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        L’assistant lit le message d’arrivée et les notes, puis
                        propose budget, quartiers, type de bien et une note.
                        Vous relisez avant d’appliquer.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => request('qualify')}
                >
                    {busy === 'qualify' ? (
                        <Spinner />
                    ) : (
                        <Sparkles aria-hidden />
                    )}
                    Qualifier avec l’IA
                </Button>
            </section>
        );
    }

    const toggle = (key: string, checked: boolean) =>
        setSelected((current) =>
            checked
                ? [...current, key]
                : current.filter((item) => item !== key),
        );

    return (
        <section
            aria-label="Qualification proposée par l’assistant"
            data-testid="lead-qualification"
            className={cn(
                'grid gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/30',
                className,
            )}
        >
            <header className="grid gap-0.5">
                <h2 className="flex flex-wrap items-center gap-2 text-base font-medium">
                    Qualification proposée
                    <AiBadge />
                    {qualification.score !== null && (
                        <span className="text-muted-foreground text-sm font-normal">
                            Note proposée : {qualification.score} / 5
                        </span>
                    )}
                </h2>
                <p className="text-muted-foreground text-xs">
                    D’après le message d’arrivée et les notes
                    {qualification.at &&
                        ` · ${dateTime.format(new Date(qualification.at))}`}
                    . Rien n’est modifié tant que vous n’appliquez pas.
                </p>
            </header>

            <p className="text-sm">{qualification.summary}</p>
            {qualification.score_reason && (
                <p className="text-muted-foreground text-sm">
                    {qualification.score_reason}
                </p>
            )}

            {qualification.fields.length > 0 ? (
                <ul role="list" className="grid gap-2 sm:grid-cols-2">
                    {qualification.fields.map((field) => {
                        const checked = selected.includes(field.key);

                        return (
                            <li key={field.key}>
                                <label
                                    htmlFor={`qualification-${field.key}`}
                                    className={cn(
                                        'bg-background flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                                        checked
                                            ? 'border-primary'
                                            : 'opacity-70',
                                    )}
                                >
                                    <Checkbox
                                        id={`qualification-${field.key}`}
                                        checked={checked}
                                        onCheckedChange={(state) =>
                                            toggle(field.key, state === true)
                                        }
                                        className="mt-0.5"
                                    />
                                    <span className="grid min-w-0 gap-0.5">
                                        <span className="text-muted-foreground text-xs">
                                            {field.label}
                                        </span>
                                        <span className="font-medium">
                                            {field.value}
                                        </span>
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-muted-foreground text-sm">
                    Tous les champs lus sont déjà renseignés : seul le résumé
                    sera ajouté à la qualification.
                </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => request('dismiss')}
                >
                    {busy === 'dismiss' ? <Spinner /> : <X aria-hidden />}
                    Ignorer
                </Button>
                <Button
                    type="button"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => request('apply')}
                >
                    {busy === 'apply' ? <Spinner /> : <Check aria-hidden />}
                    {selected.length > 0
                        ? `Appliquer ${selected.length} champ(s)`
                        : 'Ajouter le résumé'}
                </Button>
            </div>
        </section>
    );
}
