import { router } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import leadQualification from '@/routes/leads/qualification';
import type { LeadDetail } from '@/types';

const SCORES = [1, 2, 3, 4, 5] as const;

/** Ce que dit chaque note, pour le libellé et le survol. */
const scoreLabels: Record<(typeof SCORES)[number], string> = {
    1: 'Très faible',
    2: 'Faible',
    3: 'Correct',
    4: 'Bon',
    5: 'Excellent',
};

/**
 * Qualification en place sur la fiche lead (28 octobre 2026) : cinq étoiles
 * cliquables pour la qualité du lead (la même étoile recliquée retire la
 * note) et la note de qualification en texte, enregistrée par « Enregistrer »
 * ou ⌘/Ctrl+Entrée. Plus besoin d'ouvrir la page de modification pour deux
 * champs qu'on remplit au téléphone.
 */
export function LeadQualificationEditor({
    lead,
}: {
    lead: Pick<LeadDetail, 'uuid' | 'score' | 'qualification_note'>;
}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const [draft, setDraft] = useState(lead.qualification_note ?? '');
    const [busy, setBusy] = useState<'score' | 'note' | null>(null);

    // Une note enregistrée ailleurs (autre onglet, temps réel) remplace le brouillon.
    useEffect(() => {
        setDraft(lead.qualification_note ?? '');
    }, [lead.qualification_note]);

    const dirty = draft.trim() !== (lead.qualification_note ?? '').trim();
    const shown = hovered ?? lead.score ?? 0;

    const save = (kind: 'score' | 'note', score: number | null) => {
        setBusy(kind);
        router.patch(
            leadQualification.update({ lead: lead.uuid }).url,
            { score, qualification_note: draft },
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    };

    return (
        <div className="grid gap-4" data-testid="lead-qualification-editor">
            <div className="grid gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                        Qualité du lead
                    </span>
                    <span
                        className="font-medium tabular-nums"
                        data-testid="lead-score-label"
                    >
                        {shown === 0
                            ? 'Pas encore notée'
                            : `${shown} / 5 · ${scoreLabels[shown as (typeof SCORES)[number]]}`}
                    </span>
                </div>
                <div
                    role="radiogroup"
                    aria-label="Qualité du lead"
                    className="flex items-center gap-1"
                    onMouseLeave={() => setHovered(null)}
                >
                    {SCORES.map((value) => {
                        const active = value <= shown;
                        const checked = lead.score === value;

                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={checked}
                                aria-label={`${value} sur 5 · ${scoreLabels[value]}`}
                                disabled={busy !== null}
                                onMouseEnter={() => setHovered(value)}
                                onFocus={() => setHovered(value)}
                                onBlur={() => setHovered(null)}
                                onClick={() =>
                                    save('score', checked ? null : value)
                                }
                                className={cn(
                                    'focus-visible:ring-ring/50 rounded-md p-1 transition-transform duration-150 ease-out outline-none hover:scale-110 focus-visible:ring-3 disabled:opacity-60 motion-reduce:transition-none',
                                    active
                                        ? 'text-amber-500'
                                        : 'text-muted-foreground/40',
                                )}
                            >
                                <Star
                                    aria-hidden
                                    className={cn(
                                        'size-6',
                                        active && 'fill-current',
                                    )}
                                />
                            </button>
                        );
                    })}
                    {busy === 'score' && <Spinner className="ml-1" />}
                </div>
            </div>
            <div className="grid gap-1.5">
                <label
                    htmlFor="lead-qualification-note"
                    className="text-muted-foreground text-sm"
                >
                    Note de qualification
                </label>
                <Textarea
                    id="lead-qualification-note"
                    rows={3}
                    value={draft}
                    placeholder="Ce qu'on retient de l'échange : budget réel, urgence, réserves…"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (
                            event.key === 'Enter' &&
                            (event.metaKey || event.ctrlKey) &&
                            dirty
                        ) {
                            event.preventDefault();
                            save('note', lead.score);
                        }
                    }}
                />
                {dirty && (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() =>
                                setDraft(lead.qualification_note ?? '')
                            }
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => save('note', lead.score)}
                        >
                            {busy === 'note' && <Spinner />}
                            Enregistrer
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
