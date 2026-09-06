import {
    useId,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
} from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type MentionCandidate = { id: number; name: string };

/** Mot en cours de saisie s'il commence par « @ », avec sa position. */
export function mentionQuery(
    value: string,
    caret: number,
): { start: number; query: string } | null {
    const before = value.slice(0, caret);
    const at = before.lastIndexOf('@');

    if (at === -1 || (at > 0 && !/\s/.test(before[at - 1] ?? ''))) {
        return null;
    }

    const query = before.slice(at + 1);

    // Une mention ne s'étend pas au-delà d'un saut de ligne ni d'un nom complet déjà tapé.
    if (query.includes('\n') || query.length > 40) {
        return null;
    }

    return { start: at, query };
}

/** Membres dont le nom commence par la requête (insensible à la casse). */
export function matchMentions(
    query: string,
    candidates: MentionCandidate[],
): MentionCandidate[] {
    const needle = query.trim().toLowerCase();

    return candidates
        .filter((candidate) => candidate.name.toLowerCase().startsWith(needle))
        .slice(0, 5);
}

/**
 * Zone de saisie d'une note interne : « @ » propose les membres du staff,
 * ⌘/Ctrl+Entrée envoie.
 */
export function LeadNoteComposer({
    value,
    onChange,
    onSubmit,
    processing = false,
    error,
    candidates = [],
}: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    processing?: boolean;
    error?: string;
    candidates?: MentionCandidate[];
}) {
    const id = useId();
    const textarea = useRef<HTMLTextAreaElement>(null);
    const [caret, setCaret] = useState(0);
    const [active, setActive] = useState(0);
    const [dismissed, setDismissed] = useState<string | null>(null);
    const mention = mentionQuery(value, caret);
    const suggestions =
        mention && dismissed !== mention.query
            ? matchMentions(mention.query, candidates)
            : [];
    const canSubmit = !processing && value.trim() !== '';

    const insert = (candidate: MentionCandidate) => {
        if (!mention) {
            return;
        }

        const next = `${value.slice(0, mention.start)}@${candidate.name} ${value.slice(caret)}`;
        onChange(next);
        setDismissed(null);
        setActive(0);
        const position = mention.start + candidate.name.length + 2;
        requestAnimationFrame(() => {
            textarea.current?.focus();
            textarea.current?.setSelectionRange(position, position);
            setCaret(position);
        });
    };

    const submit = (event?: FormEvent) => {
        event?.preventDefault();

        if (canSubmit) {
            onSubmit();
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (suggestions.length > 0) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => (index + 1) % suggestions.length);

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive(
                    (index) =>
                        (index - 1 + suggestions.length) % suggestions.length,
                );

                return;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                insert(suggestions[active] ?? suggestions[0]!);

                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                setDismissed(mention?.query ?? null);

                return;
            }
        }

        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
        }
    };

    return (
        <form onSubmit={submit} className="grid gap-2">
            <Label htmlFor={id} className="sr-only">
                Nouvelle note
            </Label>
            <div className="relative">
                <Textarea
                    id={id}
                    ref={textarea}
                    rows={2}
                    placeholder="Ajouter une note interne… (@ pour citer un collègue)"
                    className="bg-background"
                    value={value}
                    aria-autocomplete="list"
                    aria-expanded={suggestions.length > 0}
                    aria-controls={`${id}-mentions`}
                    onChange={(event) => {
                        onChange(event.target.value);
                        setCaret(event.target.selectionStart ?? 0);
                        setDismissed(null);
                        setActive(0);
                    }}
                    onSelect={(event) =>
                        setCaret(event.currentTarget.selectionStart ?? 0)
                    }
                    onKeyDown={onKeyDown}
                />
                {suggestions.length > 0 && (
                    <ul
                        id={`${id}-mentions`}
                        role="listbox"
                        aria-label="Membres à citer"
                        className="bg-popover text-popover-foreground absolute right-0 bottom-full left-0 z-10 mb-1 grid gap-0.5 rounded-md border p-1 text-sm shadow-md"
                    >
                        {suggestions.map((candidate, index) => (
                            <li
                                key={candidate.id}
                                role="option"
                                aria-selected={index === active}
                                className={cn(
                                    'cursor-pointer rounded-sm px-2 py-1',
                                    index === active && 'bg-accent',
                                )}
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    insert(candidate);
                                }}
                                onMouseEnter={() => setActive(index)}
                            >
                                @{candidate.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <InputError message={error} />
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                    ⌘/Ctrl + Entrée pour envoyer
                </span>
                <Button type="submit" size="sm" disabled={!canSubmit}>
                    {processing && <Spinner />}
                    Ajouter la note
                </Button>
            </div>
        </form>
    );
}
