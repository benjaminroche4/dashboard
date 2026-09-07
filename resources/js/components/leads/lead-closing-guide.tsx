import {
    CalendarDays,
    Check,
    Handshake,
    Home,
    Lightbulb,
    MapPin,
    MessageCircleQuestion,
    RotateCcw,
    UserRound,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    closingGuide,
    closingQuestionCount,
    sectionProgress,
    type ClosingQuestion,
    type ClosingSection,
} from '@/lib/closing-guide';
import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'lead-closing-guide:';

function readAsked(key: string): Set<string> {
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
        const parsed: unknown = raw ? JSON.parse(raw) : [];

        return new Set(
            Array.isArray(parsed)
                ? parsed.filter((id): id is string => typeof id === 'string')
                : [],
        );
    } catch {
        return new Set();
    }
}

function writeAsked(key: string, asked: Set<string>): void {
    try {
        sessionStorage.setItem(
            STORAGE_PREFIX + key,
            JSON.stringify([...asked]),
        );
    } catch {
        // Stockage indisponible : le guide reste utilisable, sans mémoire.
    }
}

type GuideState = {
    asked: ReadonlySet<string>;
    toggle: (id: string, checked: boolean) => void;
};

/**
 * Guide de closing : volet latéral non bloquant listant, par thème, les
 * questions à poser au prospect. Chaque question se coche une fois posée ;
 * la progression est mémorisée pour la session, par lead.
 */
export function LeadClosingGuide({
    storageKey = 'new',
    className,
}: {
    /** Clé de mémorisation (identifiant du lead, ou « new »). */
    storageKey?: string;
    className?: string;
}) {
    const [asked, setAsked] = useState<Set<string>>(() =>
        readAsked(storageKey),
    );

    const update = (next: Set<string>) => {
        setAsked(next);
        writeAsked(storageKey, next);
    };
    const toggle = (id: string, checked: boolean) => {
        const next = new Set(asked);

        if (checked) {
            next.add(id);
        } else {
            next.delete(id);
        }

        update(next);
    };

    const done = asked.size;
    const percent = Math.round((done / closingQuestionCount) * 100);
    const state: GuideState = { asked, toggle };

    return (
        <Sheet modal={false}>
            <SheetTrigger asChild>
                <Button type="button" variant="outline" className={className}>
                    <MessageCircleQuestion />
                    Guide de closing
                    {done > 0 && (
                        <Badge
                            variant="secondary"
                            className="font-medium tabular-nums"
                        >
                            {done}/{closingQuestionCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent
                aria-label="Guide de closing"
                className="gap-0 sm:max-w-md"
                onInteractOutside={(event) => event.preventDefault()}
            >
                <SheetHeader className="border-b pr-12">
                    <SheetTitle>Guide de closing</SheetTitle>
                    <SheetDescription>
                        Les questions à poser pour cerner le projet. Cochez-les
                        au fil de l’appel, le formulaire reste modifiable.
                    </SheetDescription>
                    <div className="grid gap-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                {done === closingQuestionCount
                                    ? 'Toutes les questions sont posées'
                                    : `${done} sur ${closingQuestionCount} questions posées`}
                            </span>
                            <span className="font-medium tabular-nums">
                                {percent} %
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label="Questions posées"
                            aria-valuemin={0}
                            aria-valuemax={closingQuestionCount}
                            aria-valuenow={done}
                            className="bg-muted h-1.5 overflow-hidden rounded-full"
                        >
                            <div
                                className="bg-primary h-full rounded-full transition-[width]"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <CardVariants {...state} />
                </div>

                <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                    <p className="text-muted-foreground text-xs">
                        Mémorisé pour ce lead pendant la session.
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={done === 0}
                        onClick={() => update(new Set())}
                    >
                        <RotateCcw />
                        Réinitialiser
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/* ------------------------------------------------------------------ */
/* Cartes par thème : bandeau coloré avec l'icône du thème, questions  */
/* cochables en dessous.                                               */
/* ------------------------------------------------------------------ */

type SectionMeta = { icon: LucideIcon; tone: string; soft: string };

/** Icône et teinte par thème (ordre du guide). */
const sectionMeta: Record<string, SectionMeta> = {
    profile: {
        icon: UserRound,
        tone: 'text-sky-800 dark:text-sky-200',
        soft: 'bg-sky-50 dark:bg-sky-950',
    },
    criteria: {
        icon: Home,
        tone: 'text-violet-800 dark:text-violet-200',
        soft: 'bg-violet-50 dark:bg-violet-950',
    },
    location: {
        icon: MapPin,
        tone: 'text-rose-800 dark:text-rose-200',
        soft: 'bg-rose-50 dark:bg-rose-950',
    },
    budget: {
        icon: Wallet,
        tone: 'text-emerald-800 dark:text-emerald-200',
        soft: 'bg-emerald-50 dark:bg-emerald-950',
    },
    timeline: {
        icon: CalendarDays,
        tone: 'text-amber-800 dark:text-amber-200',
        soft: 'bg-amber-50 dark:bg-amber-950',
    },
    package: {
        icon: Handshake,
        tone: 'text-primary',
        soft: 'bg-primary/10',
    },
};

const fallbackMeta: SectionMeta = {
    icon: MessageCircleQuestion,
    tone: 'text-muted-foreground',
    soft: 'bg-muted',
};

const metaOf = (section: ClosingSection): SectionMeta =>
    sectionMeta[section.id] ?? fallbackMeta;

type RowProps = {
    question: ClosingQuestion;
    checked: boolean;
    onToggle: (id: string, checked: boolean) => void;
};

type RowComponent = (props: RowProps) => ReactNode;

/** Une carte par thème : bandeau coloré, puis les questions rendues par `Row`. */
function Cards({
    asked,
    toggle,
    Row,
    rows = 'grid gap-1 p-2',
}: GuideState & { Row: RowComponent; rows?: string }) {
    return (
        <div className="grid gap-3 px-4 py-4">
            {closingGuide.map((section) => {
                const meta = metaOf(section);
                const progress = sectionProgress(section, asked);
                const complete = progress.asked === progress.total;
                const Icon = complete ? Check : meta.icon;

                return (
                    <section
                        key={section.id}
                        aria-label={section.title}
                        className="overflow-hidden rounded-xl border"
                    >
                        <header
                            className={cn(
                                'flex items-center gap-2.5 px-4 py-3',
                                complete
                                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                    : cn(meta.soft, meta.tone),
                            )}
                        >
                            <Icon className="size-4.5 shrink-0" aria-hidden />
                            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {section.title}
                            </h3>
                            <span className="text-xs font-semibold tabular-nums">
                                {progress.asked}/{progress.total}
                            </span>
                        </header>
                        <ul className={rows}>
                            {section.questions.map((question) => (
                                <Row
                                    key={question.id}
                                    question={question}
                                    checked={asked.has(question.id)}
                                    onToggle={toggle}
                                />
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

/** Bouton pleine largeur qui porte l'état coché (rôle checkbox). */
function Toggle({
    question,
    checked,
    onToggle,
    className,
    children,
}: Pick<RowProps, 'question' | 'checked' | 'onToggle'> & {
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={question.topic}
            onClick={() => onToggle(question.id, !checked)}
            className={cn(
                'hover:bg-accent/60 flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                className,
            )}
        >
            {children}
        </button>
    );
}

function Tip({
    question,
    className,
    prefix,
}: {
    question: ClosingQuestion;
    className?: string;
    prefix?: string;
}) {
    if (!question.tip) {
        return null;
    }

    return (
        <p
            className={cn(
                'text-foreground/80 flex items-start gap-1.5 text-[13px]/5 text-pretty',
                className,
            )}
        >
            <Lightbulb
                className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                aria-hidden
            />
            <span>
                {prefix && <span className="font-semibold">{prefix} </span>}
                {question.tip}
            </span>
        </p>
    );
}

const struck = (checked: boolean) =>
    checked ? 'text-muted-foreground line-through' : 'text-foreground';

/** Une question : case carrée, sujet en gras puis question, astuce dans un encart gris. */
const Row: RowComponent = ({ question, checked, onToggle }) => (
    <li className="grid gap-1.5">
        <Toggle question={question} checked={checked} onToggle={onToggle}>
            <span
                className={cn(
                    'mt-1 grid size-4 shrink-0 place-items-center rounded-[4px] border',
                    checked &&
                        'bg-primary border-primary text-primary-foreground',
                )}
            >
                {checked && <Check className="size-3" aria-hidden />}
            </span>
            <span className={cn('text-sm/6 text-pretty', struck(checked))}>
                <span className="font-semibold">{question.topic} :</span>{' '}
                {question.question}
            </span>
        </Toggle>
        {!checked && question.tip && (
            <Tip
                question={question}
                className="bg-sidebar mx-2 rounded-md border px-2.5 py-2"
            />
        )}
    </li>
);

function CardVariants(state: GuideState) {
    return <Cards {...state} Row={Row} />;
}
